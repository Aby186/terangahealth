<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    private const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

    /**
     * Envoie un prompt à Gemini et retourne le texte de la réponse.
     * Essaie plusieurs modèles à la suite ; réessaie une fois après un 503 (surcharge) ;
     * met un modèle en pause 5 minutes après un 429 (quota atteint), pour ne plus perdre
     * de temps à l'appeler. Retourne null si aucun ne répond.
     */
    public function generer(
        string $prompt,
        bool $json = false,
        float $temperature = 0.4,
        int $timeout = 15,
        int $maxModeles = 3
    ): ?string {
        @set_time_limit(90);

        $cle = (string) config('services.gemini.api_key');

        if ($cle === '') {
            Log::warning('Gemini : GEMINI_API_KEY est vide.');
            return null;
        }

        $modeles = array_values(array_unique(array_filter([
            config('services.gemini.model'),
            'gemini-3-flash-preview',
            'gemini-flash-latest',
        ])));

        $config = ['temperature' => $temperature];

        if ($json) {
            $config['responseMimeType'] = 'application/json';
        }

        foreach (array_slice($modeles, 0, $maxModeles) as $modele) {
            if ($this->enPause($modele)) {
                continue;
            }

            for ($essai = 1; $essai <= 2; $essai++) {
                try {
                    $reponse = Http::timeout($timeout)
                        ->withHeaders(['x-goog-api-key' => $cle])
                        ->post(self::URL_BASE . $modele . ':generateContent', [
                            'contents'         => [['parts' => [['text' => $prompt]]]],
                            'generationConfig' => $config,
                        ]);

                    if (! $reponse->successful()) {
                        $statut = $reponse->status();
                        Log::warning("Gemini {$modele} (essai {$essai}) : HTTP {$statut} " . substr((string) $reponse->json('error.message'), 0, 120));

                        if ($statut === 429) {
                            $this->mettreEnPause($modele);
                        }

                        if ($statut === 503 && $essai === 1) {
                            sleep(2);
                            continue;
                        }

                        break;
                    }

                    $texte = collect($reponse->json('candidates.0.content.parts', []))
                        ->filter(fn ($partie) => empty($partie['thought']))
                        ->pluck('text')
                        ->implode('');

                    if (trim($texte) === '') {
                        Log::warning("Gemini {$modele} : réponse vide.");
                        break;
                    }

                    Log::info("Gemini : réponse obtenue avec {$modele}" . ($essai > 1 ? ' (après un réessai).' : '.'));

                    return $texte;
                } catch (\Exception $e) {
                    Log::warning("Gemini {$modele} : " . str_replace($cle, '***', $e->getMessage()));
                    break;
                }
            }
        }

        return null;
    }

    private function enPause(string $modele): bool
    {
        try {
            return Cache::has("gemini.pause.{$modele}");
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function mettreEnPause(string $modele): void
    {
        try {
            Cache::put("gemini.pause.{$modele}", true, now()->addMinutes(5));
            Log::info("Gemini : {$modele} mis en pause 5 minutes (quota atteint).");
        } catch (\Throwable $e) {
            // sans cache, on continue simplement à l'appeler
        }
    }
}