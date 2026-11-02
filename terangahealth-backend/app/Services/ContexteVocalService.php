<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ContexteVocalService
{
    private function cle(string $nom, int $userId): string
    {
        return "assistant_vocal.{$nom}.{$userId}";
    }

    private function ecrire(string $nom, int $userId, $valeur): void
    {
        try {
            Cache::put($this->cle($nom, $userId), $valeur, now()->addMinutes(10));
        } catch (\Throwable $e) {
            Log::warning('Assistant vocal : contexte non mémorisé : ' . $e->getMessage());
        }
    }

    private function lire(string $nom, int $userId)
    {
        try {
            return Cache::get($this->cle($nom, $userId));
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function memoriserMotif(int $userId, string $motif): void
    {
        $this->ecrire('motif', $userId, $motif);
    }

    public function motif(int $userId): ?string
    {
        $motif = $this->lire('motif', $userId);

        return is_string($motif) ? $motif : null;
    }

    public function memoriserChoix(int $userId, array $creneau): void
    {
        $this->ecrire('choix', $userId, $creneau);
    }

    public function choix(int $userId): ?array
    {
        $choix = $this->lire('choix', $userId);

        return is_array($choix) ? $choix : null;
    }

    public function oublierChoix(int $userId): void
    {
        Cache::forget($this->cle('choix', $userId));
    }

    public function oublier(int $userId): void
    {
        Cache::forget($this->cle('choix', $userId));
        Cache::forget($this->cle('motif', $userId));
    }

    /**
     * true = oui, false = non, null = pas clair.
     */
    public function reponseOuiNon(string $texteFr): ?bool
    {
        $t = ' ' . str_replace(['-', "'", ',', '.', '!', '?'], ' ', Str::lower(Str::ascii($texteFr))) . ' ';

        $oui = preg_match('/\b(oui|ok|okay|d accord|accord|bien sur|c est bon|waaw|waw|volontiers|vas y|allez)\b/', $t) === 1;
        $non = preg_match('/\b(non|jamais|changer|autre|deedeet|dedet)\b/', $t) === 1;

        if ($oui && ! $non) {
            return true;
        }

        if ($non && ! $oui) {
            return false;
        }

        return null;
    }
}