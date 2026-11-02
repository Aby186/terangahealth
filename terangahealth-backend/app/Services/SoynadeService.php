<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SoynadeService
{
    private function url(string $chemin): string
    {
        return rtrim(config('services.soynade.base_url'), '/') . $chemin;
    }

    /**
     * Transcrit un enregistrement wolof (WAV, MP3 ou FLAC) en texte wolof.
     * Retourne null en cas d'échec.
     */
    public function transcrire(UploadedFile $audio): ?string
    {
        try {
            $reponse = Http::withToken(config('services.soynade.api_key'))
                ->timeout(30)
                ->attach('file', file_get_contents($audio->getRealPath()), $audio->getClientOriginalName())
                ->post($this->url('/v1/audio/transcriptions'), [
                    'language'        => 'wo',
                    'response_format' => 'json',
                    'temperature'     => 0.1,
                ]);

            if (! $reponse->successful()) {
                Log::warning('Soynade transcription : statut ' . $reponse->status());
                return null;
            }

            return $reponse->json('text');
        } catch (\Exception $e) {
            Log::warning('Soynade transcription : ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Traduit un texte entre wolof (wo), français (fr) et anglais (en).
     * Retourne null en cas d'échec.
     */
    public function traduire(string $texte, string $langueSource, string $langueCible): ?string
    {
        try {
            $reponse = Http::withToken(config('services.soynade.api_key'))
                ->timeout(30)
                ->post($this->url('/v1/translations'), [
                    'text'            => $texte,
                    'source_language' => $langueSource,
                    'target_language' => $langueCible,
                    'temperature'     => 0.1,
                ]);

            if (! $reponse->successful()) {
                Log::warning('Soynade traduction : statut ' . $reponse->status());
                return null;
            }

            return $reponse->json('translated_text');
        } catch (\Exception $e) {
            Log::warning('Soynade traduction : ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Transforme un texte wolof en audio WAV (contenu binaire).
     * Retourne null en cas d'échec.
     */
    public function synthetiser(string $texteWolof): ?string
    {
        try {
            $reponse = Http::withToken(config('services.soynade.api_key'))
                ->timeout(60)
                ->post($this->url('/v1/text-to-speech'), [
                    'text'          => $texteWolof,
                    'language'      => 'wo',
                    'output_format' => 'wav',
                    'exaggeration'  => 0.2,
                    'temperature'   => 0.1,
                    'cfg_weight'    => 0.5,
                    'seed'          => 0,
                ]);

            if (! $reponse->successful()) {
                Log::warning('Soynade synthèse vocale : statut ' . $reponse->status());
                return null;
            }

            return $reponse->body();
        } catch (\Exception $e) {
            Log::warning('Soynade synthèse vocale : ' . $e->getMessage());
            return null;
        }
    }
}