<?php

namespace App\Services;

use App\Models\Creneau;
use App\Models\Paiement;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Paydunya\Checkout\CheckoutInvoice;
use Paydunya\Checkout\Store;

class FacturePaydunyaService
{
    /**
     * Crée un paiement en attente et la facture PayDunya (même logique que
     * PaiementController::initier). Le rendez-vous n'est créé qu'après le paiement, par l'IPN.
     * Retourne ['url' => ..., 'paiement_id' => ...] ou ['erreur' => ...].
     */
    public function creer(User $patient, int $medecinId, int $creneauId, string $motif): array
    {
        $medecin = User::find($medecinId);

        if (! $medecin || ! $medecin->isMedecin() || ! $medecin->service) {
            return ['erreur' => 'Médecin ou service invalide.'];
        }

        $creneau = Creneau::find($creneauId);

        if ($creneau && \Illuminate\Support\Carbon::parse(substr((string) $creneau->planning->date_planning, 0, 10) . ' ' . $creneau->heure_debut, config('app.timezone'))->lte(now(config('app.timezone')))) {
            return ['erreur' => "Ce cr\u{e9}neau est d\u{e9}j\u{e0} pass\u{e9}."];
        }

        if (! $creneau || $creneau->status !== 'disponible') {
            return ['erreur' => "Ce créneau n'est plus disponible."];
        }

        $service = $medecin->service;

        $paiement = Paiement::create([
            'patient_id' => $patient->id,
            'montant'    => $service->tarif,
            'statut'     => 'en_attente',
        ]);

        $this->configurer();

        $invoice = new CheckoutInvoice();
        $invoice->addItem($service->nom . ' - Consultation', 1, $service->tarif, $service->tarif);
        $invoice->setTotalAmount($service->tarif);
        $invoice->setDescription('Consultation ' . $service->nom . ' - TerangaHealth');
        $invoice->addChannels(['card', 'wave-senegal', 'orange-money-senegal']);
        $invoice->setReturnUrl('http://localhost:4200/paiement/retour?paiement_id=' . $paiement->id);
        $invoice->setCancelUrl('http://localhost:4200/prendre-rdv');

        $invoice->addCustomData('paiement_id', $paiement->id);
        $invoice->addCustomData('patient_id', $patient->id);
        $invoice->addCustomData('medecin_id', $medecin->id);
        $invoice->addCustomData('creneau_id', $creneau->id);
        $invoice->addCustomData('service_id', $service->id);
        $invoice->addCustomData('motif', $motif);
        $invoice->addCustomData('notes', '');

        if ($invoice->create()) {
            $paiement->update(['reference_transaction' => $invoice->token]);

            $url = app(SoftpayService::class)->urlOrangeMoney($patient, (string) $invoice->token) ?? $invoice->getInvoiceUrl();

            return ['url' => $url, 'paiement_id' => $paiement->id];
        }

        $paiement->update(['statut' => 'echoue']);
        Log::warning('Assistant vocal : facture PayDunya refusée : ' . ($invoice->response_text ?? 'erreur inconnue'));

        return ['erreur' => (string) ($invoice->response_text ?? 'Erreur inconnue')];
    }

    private function configurer(): void
    {
        \Paydunya\Setup::setMasterKey(config('services.paydunya.master_key'));
        \Paydunya\Setup::setPublicKey(config('services.paydunya.public_key'));
        \Paydunya\Setup::setPrivateKey(config('services.paydunya.private_key'));
        \Paydunya\Setup::setToken(config('services.paydunya.token'));
        \Paydunya\Setup::setMode(config('services.paydunya.mode', 'test'));

        Store::setName('TerangaHealth');
    }
}