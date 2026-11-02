<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Facades\Log;

trait ReponseVocale
{
    /**
     * Prononce une phrase fixe du fichier de configuration.
     */
    private function repondre(string $etapeSuivante, string $cle, ?string $comprisFr = null)
    {
        $phrase = config('assistant_vocal.' . $cle, []);
        $wolof = (string) ($phrase['wo'] ?? '');

        if ($wolof === '') {
            Log::error("Assistant vocal : la phrase '{$cle}' est absente ou vide dans config/assistant_vocal.php.");
        }

        $audio = $this->introWolof($phrase) === '' ? null : $this->soynade->synthetiser($wolof);

        return $this->json($etapeSuivante, $comprisFr, (string) ($phrase['fr'] ?? ''), $wolof, $audio);
    }

    /**
     * Le wolof d'une phrase, ou '' tant qu'il reste "À ÉCRIRE EN WOLOF".
     */
    private function introWolof(array $phrase): string
    {
        $wolof = (string) ($phrase['wo'] ?? '');

        return str_contains($wolof, 'À ÉCRIRE') ? '' : $wolof;
    }

    /**
     * Ce que la voix dit pour une phrase fixe : son wolof, ou à défaut son français.
     */
    private function dire(string $cle): string
    {
        $phrase = config('assistant_vocal.' . $cle, []);

        return $this->introWolof($phrase) ?: (string) ($phrase['fr'] ?? '');
    }

    private function json(
        string $etapeSuivante,
        ?string $comprisFr,
        string $reponseFr,
        string $reponseWolof,
        ?string $audio,
        array $creneaux = [],
        ?int $serviceId = null,
        ?string $urlPaiement = null
    ) {
        return response()->json([
            'etape_suivante' => $etapeSuivante,
            'compris_fr'     => $comprisFr,
            'reponse_fr'     => $reponseFr,
            'reponse_wo'     => $reponseWolof,
            'audio_base64'   => $audio ? base64_encode($audio) : null,
            'service_id'     => $serviceId,
            'creneaux'       => $creneaux,
            'url_paiement'   => $urlPaiement,
        ]);
    }
}