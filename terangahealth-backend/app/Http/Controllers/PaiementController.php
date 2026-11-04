<?php

namespace App\Http\Controllers;

use App\Models\Creneau;
use App\Models\Paiement;
use App\Models\RendezVous;
use App\Models\User;
use App\Notifications\RecuPaiementNotification;
use App\Services\UrgenceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Paydunya\Checkout\CheckoutInvoice;
use Paydunya\Checkout\Store;

class PaiementController extends Controller
{
    /**
     * Configure les identifiants PayDunya (appelé au début de chaque méthode
     * qui communique avec leur API).
     */
    private function configurerPaydunya(): void
    {
        \Paydunya\Setup::setMasterKey(config('services.paydunya.master_key'));
        \Paydunya\Setup::setPublicKey(config('services.paydunya.public_key'));
        \Paydunya\Setup::setPrivateKey(config('services.paydunya.private_key'));
        \Paydunya\Setup::setToken(config('services.paydunya.token'));
        \Paydunya\Setup::setMode(config('services.paydunya.mode', 'test'));

        Store::setName('TerangaHealth');
    }

    /**
     * Initie un paiement : crée un enregistrement Paiement en attente,
     * génère une facture PayDunya, et renvoie l'URL de paiement vers
     * laquelle rediriger le patient. Le rendez-vous n'est PAS créé ici —
     * il ne le sera qu'une fois le paiement confirmé (voir ipn()).
     * POST /api/paiements/initier
     */
    public function initier(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'medecin_id' => 'required|exists:users,id',
            'creneau_id' => 'required|exists:creneaux,id',
            'motif'      => 'required|string|min:10',
            'notes'      => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $medecin = User::findOrFail($request->medecin_id);

        if (! $medecin->isMedecin() || ! $medecin->service) {
            return response()->json(['message' => 'Médecin ou service invalide.'], 422);
        }

        $creneau = Creneau::with('planning')->findOrFail($request->creneau_id);

        if (\Illuminate\Support\Carbon::parse(substr((string) $creneau->planning->date_planning, 0, 10) . ' ' . $creneau->heure_debut, config('app.timezone'))->lte(now(config('app.timezone')))) {
            return response()->json([
                'message' => "Ce cr\u{e9}neau est d\u{e9}j\u{e0} pass\u{e9}.",
            ], 422);
        }

        if ($creneau->status !== 'disponible') {
            return response()->json(['message' => 'Ce créneau n\'est plus disponible.'], 409);
        }

        $service = $medecin->service;

        $paiement = Paiement::create([
            'patient_id' => $request->user()->id,
            'montant'    => $service->tarif,
            'statut'     => 'en_attente',
        ]);

        $this->configurerPaydunya();

        $invoice = new CheckoutInvoice();
        $invoice->addItem($service->nom . ' - Consultation', 1, $service->tarif, $service->tarif);
        $invoice->setTotalAmount($service->tarif);
        $invoice->setDescription('Consultation ' . $service->nom . ' - TerangaHealth');
        $invoice->addChannels(['card', 'wave-senegal', 'orange-money-senegal']);
        $invoice->setReturnUrl(rtrim(config('app.frontend_url'), '/') . '/paiement/retour?paiement_id=' . $paiement->id);
        $invoice->setCancelUrl(rtrim(config('app.frontend_url'), '/') . '/prendre-rdv');

        $invoice->addCustomData('paiement_id', $paiement->id);
        $invoice->addCustomData('patient_id', $request->user()->id);
        $invoice->addCustomData('medecin_id', $medecin->id);
        $invoice->addCustomData('creneau_id', $creneau->id);
        $invoice->addCustomData('service_id', $service->id);
        $invoice->addCustomData('motif', $request->motif);
        $invoice->addCustomData('notes', $request->notes ?? '');

        if ($invoice->create()) {
            $paiement->update(['reference_transaction' => $invoice->token]);

            return response()->json([
                'paiement_id'  => $paiement->id,
                'url_paiement' => $this->urlPaiementSoftpay($request, (string) $invoice->token) ?? $invoice->getInvoiceUrl(),
            ]);
        }

        $paiement->update(['statut' => 'echoue']);

        $erreurPaydunya = $invoice->response_text ?? 'Erreur inconnue';

        Log::error('PayDunya : création de facture échouée', [
            'mode'             => config('services.paydunya.mode'),
            'public_key_debut' => substr((string) config('services.paydunya.public_key'), 0, 12),
            'erreur'           => $erreurPaydunya,
        ]);

        return response()->json([
            'message' => 'Impossible de créer la facture de paiement : ' . $erreurPaydunya,
            'erreur'  => $erreurPaydunya,
        ], 500);
    }

    /**
     * Endpoint appelé automatiquement par PayDunya dès que le client confirme
     * son paiement. On ne fait jamais confiance au contenu brut de la requête :
     * on revérifie le vrai statut via l'API PayDunya (invoice->confirm()) avant
     * de créer le rendez-vous.
     * POST /api/paydunya/ipn
     */
    public function ipn(Request $request)
    {
        $this->configurerPaydunya();

        $token = $request->input('data')['invoice']['token'] ?? $request->input('token');

        if (! $token) {
            Log::warning('IPN PayDunya reçu sans token.');
            return response('Token manquant', 400);
        }

        $invoice = new CheckoutInvoice();

        if (! $invoice->confirm($token)) {
            Log::warning("IPN PayDunya : facture {$token} non confirmée ou introuvable.");
            return response('Facture non confirmée', 400);
        }

        if ($invoice->getStatus() !== 'completed') {
            Log::info("IPN PayDunya : facture {$token} avec statut {$invoice->getStatus()}, pas encore complétée.");
            return response('OK', 200);
        }

        $resultat = $this->finaliserPaiement($invoice, $token);

        return response($resultat['message'], $resultat['code']);
    }

    private function finaliserPaiement(CheckoutInvoice $invoice, string $token): array
    {
        $envoyerRecu = null;

        $resultat = $this->traiterPaiement($invoice, $token, $envoyerRecu);

        if ($envoyerRecu) {
            $urlRecu = null;

            try {
                $urlRecu = method_exists($invoice, 'getReceiptUrl')
                    ? $invoice->getReceiptUrl()
                    : ($invoice->receipt_url ?? null);
            } catch (\Throwable $e) {
                $urlRecu = null;
            }

            $this->envoyerRecu($envoyerRecu[0], $envoyerRecu[1], $urlRecu ?: null);
        }

        return $resultat;
    }

    /**
     * Envoie le recu au patient par e-mail et par SMS. Une panne d'envoi ne doit
     * jamais affecter le paiement : l'erreur est seulement ecrite dans le log.
     */
    private function envoyerRecu(int $rendezVousId, float $montant, ?string $urlRecu): void
    {
        try {
            $rendezVous = RendezVous::with('patient', 'service')->find($rendezVousId);

            if (! $rendezVous || ! $rendezVous->patient) {
                return;
            }

            $rendezVous->patient->notify(new RecuPaiementNotification($rendezVous, $montant, $urlRecu));
        } catch (\Throwable $e) {
            Log::warning('Recu de paiement non envoye : ' . $e->getMessage());
        }
    }

    /**
     * SoftPay Orange Money (Max it) : le patient n'a aucun formulaire a remplir, ses
     * informations viennent de son compte. Si SoftPay echoue, on renvoie null et le
     * paiement continue avec la page PayDunya classique.
     */
    private function urlPaiementSoftpay(Request $request, string $token): ?string
    {
        try {
            $user = $request->user();
            $nom = trim(($user->prenom ?? '') . ' ' . ($user->nom ?? ''));
            $telephone = substr(preg_replace('/\D+/', '', (string) ($request->input('telephone_paiement') ?: $user->telephone)), -9);

            if ($token === '' || strlen($telephone) !== 9 || empty($user->email)) {
                return null;
            }

            $reponse = Http::withHeaders([
                'PAYDUNYA-MASTER-KEY'  => config('services.paydunya.master_key'),
                'PAYDUNYA-PRIVATE-KEY' => config('services.paydunya.private_key'),
                'PAYDUNYA-TOKEN'       => config('services.paydunya.token'),
            ])->acceptJson()->timeout(20)->post('https://app.paydunya.com/api/v1/softpay/new-orange-money-senegal', [
                'customer_name'  => $nom !== '' ? $nom : 'Patient',
                'customer_email' => $user->email,
                'phone_number'   => $telephone,
                'invoice_token'  => $token,
            ]);

            if (! $reponse->successful() || ! $reponse->json('success')) {
                Log::warning('SoftPay Orange Money : echec (' . $reponse->status() . ') : ' . $reponse->body());
                return null;
            }

            $mobile = (bool) preg_match('/Android|iPhone|iPad|Mobile/i', (string) $request->userAgent());
            $urlMobile = $reponse->json('other_url.maxit_url');

            return ($mobile && $urlMobile) ? $urlMobile : ($reponse->json('url') ?: null);
        } catch (\Throwable $e) {
            Log::warning('SoftPay Orange Money : ' . $e->getMessage());
            return null;
        }
    }

    private function traiterPaiement(CheckoutInvoice $invoice, string $token, &$envoyerRecu): array
    {
        return DB::transaction(function () use ($invoice, $token, &$envoyerRecu) {
            $paiementId = $invoice->getCustomData('paiement_id');
            $paiement = Paiement::whereKey($paiementId)->lockForUpdate()->first();

            if (! $paiement) {
                Log::error("IPN PayDunya : paiement introuvable pour la facture {$token}.");
                return ['code' => 404, 'message' => 'Paiement introuvable'];
            }

            if ($paiement->statut === 'paye') {
                // déjà traité, évite de créer un doublon si PayDunya renvoie l'IPN plusieurs fois
                return ['code' => 200, 'message' => 'OK'];
            }

            $creneau = Creneau::with('planning')->find($invoice->getCustomData('creneau_id'));

            if (! $creneau || $creneau->status !== 'disponible') {
                $paiement->update(['statut' => 'echoue']);
                Log::warning("IPN PayDunya : créneau {$invoice->getCustomData('creneau_id')} indisponible au moment de la confirmation.");
                return ['code' => 409, 'message' => 'Créneau indisponible'];
            }

            $medecin = User::find($invoice->getCustomData('medecin_id'));

            $rendezVous = RendezVous::create([
                'patient_id'        => $invoice->getCustomData('patient_id'),
                'medecin_id'        => $invoice->getCustomData('medecin_id'),
                'service_id'        => $invoice->getCustomData('service_id'),
                'creneau_id'        => $creneau->id,
                'motif'             => $invoice->getCustomData('motif'),
                'notes'             => $invoice->getCustomData('notes') ?: null,
                'date_rendez_vous'  => $creneau->planning->date_planning,
                'heure_rendez_vous' => $creneau->heure_debut,
                'status'            => 'en_attente',
                'urgent'            => RendezVous::detecterUrgence($invoice->getCustomData('motif'), $medecin->service->nom ?? ''),
            ]);

            $creneau->update(['status' => 'reserve']);

            $paiement->update([
                'statut'         => 'paye',
                'rendez_vous_id' => $rendezVous->id,
                'date_paiement'  => now(),
            ]);

            $envoyerRecu = [$rendezVous->id, (float) $paiement->montant];

            Log::info("Paiement {$paiement->id} confirmé, rendez-vous {$rendezVous->id} créé.");

            // Second avis de l'IA sur l'urgence, fait APRÈS la confirmation du paiement :
            // une panne ou une lenteur de l'IA ne doit jamais bloquer ni annuler un paiement.
            // Les mots-clés ont déjà été appliqués à la création ; l'IA ne regarde que les
            // motifs qu'ils n'ont pas jugés urgents.
            if (! $rendezVous->urgent) {
                try {
                    $urgent = app(UrgenceService::class)->detecter(
                        (string) $invoice->getCustomData('motif'),
                        $medecin->service->nom ?? ''
                    );

                    if ($urgent) {
                        $rendezVous->update(['urgent' => true]);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Urgence IA : ' . $e->getMessage());
                }
            }

            return ['code' => 200, 'message' => 'OK'];
        });
    }

    /**
     * Historique des paiements — patient (le sien) ou secrétaire/admin (tous).
     * GET /api/paiements/historique
     */
    public function historique(Request $request)
    {
        $user = $request->user();

        $query = Paiement::with('rendezVous.patient', 'rendezVous.medecin', 'rendezVous.service')
            ->whereNotNull('rendez_vous_id')
            ->orderBy('created_at', 'desc');

        if ($user->isPatient()) {
            $query->whereHas('rendezVous', fn ($q) => $q->where('patient_id', $user->id));
        } elseif (! $user->isSecretaire() && ! $user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        return response()->json($query->get());
    }

    /**
     * Vérifie le statut d'un paiement (utilisé par la page de retour après
     * PayDunya, pour savoir si le RDV a bien été créé côté IPN).
     * GET /api/paiements/{paiement}/statut
     */
    public function statut(Request $request, Paiement $paiement)
    {
        if ($paiement->patient_id !== $request->user()->id) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        if ($paiement->statut === 'en_attente' && ! empty($paiement->reference_transaction)) {
            try {
                $this->configurerPaydunya();
                $invoice = new CheckoutInvoice();

                if ($invoice->confirm($paiement->reference_transaction) && $invoice->getStatus() === 'completed') {
                    $resultat = $this->finaliserPaiement($invoice, $paiement->reference_transaction);
                    $paiement->refresh();
                } elseif (in_array($invoice->getStatus(), ['cancelled', 'failed'], true)) {
                    $paiement->update(['statut' => 'echoue']);
                }
            } catch (\Throwable $e) {
                Log::warning('Paiement statut PayDunya : ' . $e->getMessage(), [
                    'paiement_id' => $paiement->id,
                    'reference_transaction' => $paiement->reference_transaction,
                ]);
            }
        }

        return response()->json([
            'statut'         => $paiement->statut,
            'rendez_vous_id' => $paiement->rendez_vous_id,
        ]);
    }
}