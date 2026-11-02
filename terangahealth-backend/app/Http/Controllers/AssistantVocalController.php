<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ReponseVocale;
use App\Models\Service;
use App\Models\User;
use App\Services\AnalyseVocaleService;
use App\Services\ChoixCreneauService;
use App\Services\ContexteVocalService;
use App\Services\FacturePaydunyaService;
use App\Services\RechercheVocaleService;
use App\Services\SoynadeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class AssistantVocalController extends Controller
{
    use ReponseVocale;

    public function __construct(
        private SoynadeService $soynade,
        private AnalyseVocaleService $analyse,
        private RechercheVocaleService $recherche,
        private ChoixCreneauService $choix,
        private ContexteVocalService $contexte,
        private FacturePaydunyaService $facture
    ) {
    }

    /**
     * Un tour de conversation vocale (le patient parle wolof).
     * POST /api/assistant-vocal/converser
     */
    public function converser(Request $request)
    {
        set_time_limit(150);

        $patient = $request->user();

        if (! $patient->isPatient()) {
            return response()->json(['message' => 'Réservé aux patients.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'etape' => 'required|in:debut,specialite',
            'audio' => ['required_unless:etape,debut', 'nullable', 'file', 'max:5120',
                'mimetypes:audio/wav,audio/x-wav,audio/wave,audio/vnd.wave,audio/mpeg,audio/flac,audio/x-flac'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Données invalides.', 'errors' => $validator->errors()], 422);
        }

        $userId = $patient->id;

        if ($request->etape === 'debut') {
            $this->choix->oublier($userId);
            $this->contexte->oublier($userId);

            return $this->repondre('specialite', 'salutation');
        }

        $texteWolof = $this->soynade->transcrire($request->file('audio'));
        $texteFr = $texteWolof ? $this->soynade->traduire($texteWolof, 'wo', 'fr') : null;

        if (! $texteFr) {
            return $this->repondre('specialite', 'repeter');
        }

        // 1) Un créneau est choisi : le patient confirme ou refuse le paiement.
        $enAttente = $this->contexte->choix($userId);

        if ($enAttente) {
            return $this->traiterConfirmation($patient, $enAttente, $texteFr);
        }

        // 2) Le patient choisit parmi les créneaux proposés.
        $proposes = $this->choix->recuperer($userId);
        $choisi = $this->choix->choisir($texteFr, $proposes);

        if ($choisi) {
            return $this->demanderConfirmation($userId, $choisi, $texteFr);
        }

        // 3) Nouvelle demande : l'IA analyse ; sans elle, les mots-clés.
        $resultat = $this->analyse->analyser($texteFr);
        $service = $resultat === null ? $this->recherche->trouverService($texteFr) : $resultat['service'];

        if ($service) {
            return $this->proposerCreneaux($userId, $service, $texteFr);
        }

        $secours = $proposes ? 'choix_inconnu' : 'specialite_inconnue';

        if ($resultat === null || $resultat['sans_precision']) {
            $domaine = config('assistant_vocal.demander_domaine.wo') ? 'demander_domaine' : 'specialite_inconnue';

            return $this->repondre('specialite', $proposes ? 'choix_inconnu' : $domaine, $texteFr);
        }

        if ($resultat['reponse'] !== '') {
            return $this->reponseLibre($resultat['reponse'], $texteFr, $secours);
        }

        return $this->repondre('specialite', $secours, $texteFr);
    }

    private function traiterConfirmation(User $patient, array $creneau, string $texteFr)
    {
        $oui = $this->contexte->reponseOuiNon($texteFr);

        if ($oui === true) {
            return $this->ouvrirPaiement($patient, $creneau, $texteFr);
        }

        $creneaux = $this->choix->recuperer($patient->id);

        if ($oui === null) {
            // Il a peut-être choisi un autre créneau au lieu de répondre oui ou non.
            $autre = $this->choix->choisir($texteFr, $creneaux);

            return $this->demanderConfirmation($patient->id, $autre ?: $creneau, $texteFr);
        }

        $this->contexte->oublierChoix($patient->id);

        return $creneaux === []
            ? $this->repondre('specialite', 'specialite_inconnue', $texteFr)
            : $this->annoncer($creneaux, '', $texteFr, null);
    }

    private function proposerCreneaux(int $userId, Service $service, string $texteFr)
    {
        $creneaux = $this->recherche->creneauxProposes($service);

        if (empty($creneaux)) {
            return $this->repondre('specialite', 'aucun_creneau', $texteFr);
        }

        $this->choix->memoriser($userId, $creneaux);
        $this->contexte->oublierChoix($userId);
        $this->contexte->memoriserMotif($userId, "{$service->nom} : {$texteFr}");

        Log::info("Assistant vocal : créneaux annoncés pour {$service->nom}.");

        return $this->annoncer($creneaux, "En {$service->nom}. ", $texteFr, $service->id);
    }

    /**
     * Introduction en wolof, puis les créneaux en français, dans un seul audio.
     */
    private function annoncer(array $creneaux, string $debut, string $texteFr, ?int $serviceId)
    {
        $phrase = config('assistant_vocal.creneaux', []);
        $intro = $this->introWolof($phrase);
        $ordinaux = ['Premier', 'Deuxième', 'Troisième'];
        $dit = $debut;

        foreach ($creneaux as $i => $c) {
            $dit .= "{$ordinaux[$i]} créneau : {$c['date']} à {$c['heure_dite']}, avec le docteur {$c['medecin']}. ";
        }

        $audio = $this->soynade->synthetiser(trim($intro . ' ' . $dit));

        return $this->json('creneau', $texteFr, (string) ($phrase['fr'] ?? ''), $intro, $audio, $creneaux, $serviceId);
    }

    private function demanderConfirmation(int $userId, array $creneau, string $texteFr)
    {
        $this->contexte->memoriserChoix($userId, $creneau);

        $phrase = config('assistant_vocal.demander_confirmation', []);
        $dit = "{$this->introChoix()} : {$creneau['date']} à {$creneau['heure_dite']}, avec le docteur {$creneau['medecin']}. "
            . $this->dire('demander_confirmation');

        $audio = $this->soynade->synthetiser($dit);

        Log::info("Assistant vocal : confirmation demandée ({$creneau['date']} {$creneau['heure']}).");

        return $this->json('confirmation', $texteFr, (string) ($phrase['fr'] ?? ''), $this->introWolof($phrase), $audio, [$creneau]);
    }

    /**
     * « Vous avez choisi » en wolof ; en français tant que la phrase wolof
     * n'est pas écrite dans config/assistant_vocal.php.
     */
    private function introChoix(): string
    {
        $wolof = trim((string) config('assistant_vocal.choix_annonce.wo', ''));

        if ($wolof === '' || str_contains($wolof, 'À ÉCRIRE EN WOLOF')) {
            return 'Vous avez choisi';
        }

        return $wolof;
    }

    private function ouvrirPaiement(User $patient, array $creneau, string $texteFr)
    {
        $motif = $this->contexte->motif($patient->id) ?? 'Consultation demandée à la voix';

        if (mb_strlen($motif) < 10) {
            $motif = 'Consultation demandée à la voix : ' . $motif;
        }

        $resultat = $this->facture->creer($patient, (int) $creneau['medecin_id'], (int) $creneau['creneau_id'], $motif);

        if (! isset($resultat['url'])) {
            Log::warning('Assistant vocal : paiement impossible : ' . ($resultat['erreur'] ?? 'inconnu'));
            $this->contexte->oublierChoix($patient->id);

            return $this->repondre('specialite', 'paiement_impossible', $texteFr);
        }

        $this->choix->oublier($patient->id);
        $this->contexte->oublier($patient->id);

        $phrase = config('assistant_vocal.paiement_ouvert', []);
        $audio = $this->soynade->synthetiser($this->dire('paiement_ouvert'));

        Log::info("Assistant vocal : paiement ouvert (paiement {$resultat['paiement_id']}).");

        return $this->json('paiement', $texteFr, (string) ($phrase['fr'] ?? ''), $this->introWolof($phrase), $audio, [$creneau], null, $resultat['url']);
    }

    /**
     * Réponse libre : texte français de l'IA -> wolof -> voix.
     */
    private function reponseLibre(string $reponseFr, string $texteFr, string $cleSecours)
    {
        $wolof = $this->soynade->traduire($reponseFr, 'fr', 'wo');

        if (! $wolof || $this->analyse->ressembleAuFrancais($wolof, $reponseFr)) {
            Log::warning('Assistant vocal : traduction de la réponse libre inutilisable, phrase fixe utilisée.');

            return $this->repondre('specialite', $cleSecours, $texteFr);
        }

        Log::info('Assistant vocal : réponse libre donnée.');

        return $this->json('specialite', $texteFr, $reponseFr, $wolof, $this->soynade->synthetiser($wolof));
    }
}