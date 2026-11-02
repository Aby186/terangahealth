<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ChoixCreneauService
{
    private function cle(int $userId): string
    {
        return "assistant_vocal.creneaux.{$userId}";
    }

    public function memoriser(int $userId, array $creneaux): void
    {
        try {
            Cache::put($this->cle($userId), $creneaux, now()->addMinutes(10));
        } catch (\Throwable $e) {
            Log::warning('Assistant vocal : créneaux non mémorisés : ' . $e->getMessage());
        }
    }

    public function recuperer(int $userId): array
    {
        try {
            return (array) Cache::get($this->cle($userId), []);
        } catch (\Throwable $e) {
            return [];
        }
    }

    public function oublier(int $userId): void
    {
        try {
            Cache::forget($this->cle($userId));
        } catch (\Throwable $e) {
            // rien à faire
        }
    }

    /**
     * Retrouve le créneau choisi par le patient (rang, heure, ou jour), ou null.
     */
    public function choisir(string $texteFr, array $creneaux): ?array
    {
        if ($creneaux === []) {
            return null;
        }

        $t = str_replace('-', ' ', Str::lower(Str::ascii($texteFr)));

        $rang = $this->rang($t, count($creneaux));

        if ($rang !== null) {
            return $creneaux[$rang];
        }

        $heure = $this->heure($t);

        if ($heure === null) {
            return null;
        }

        [$h, $min] = $heure;

        $candidats = array_values(array_filter($creneaux, function ($c) use ($h, $min) {
            [$ch, $cm] = $this->heureCreneau($c);

            return $ch === $h && ($min === null || $cm === $min);
        }));

        if (count($candidats) > 1 && $min === null) {
            $pleines = array_values(array_filter($candidats, fn ($c) => $this->heureCreneau($c)[1] === 0));
            $candidats = $pleines !== [] ? $pleines : $candidats;
        }

        if (count($candidats) > 1 && preg_match('/\ble\s+(\d{1,2})\b/', $t, $m)) {
            $jour = (int) $m[1];
            $candidats = array_values(array_filter($candidats, fn ($c) => $this->jourCreneau($c) === $jour));
        }

        return count($candidats) === 1 ? $candidats[0] : null;
    }

    private function rang(string $t, int $n): ?int
    {
        if (preg_match('/\b(premier|premiere|1er|1ere)\b/', $t)) {
            return 0;
        }

        if ($n >= 2 && preg_match('/\b(deuxieme|second|seconde|2eme)\b/', $t)) {
            return 1;
        }

        if ($n >= 3 && preg_match('/\b(troisieme|3eme)\b/', $t)) {
            return 2;
        }

        if (preg_match('/\bdernier\b/', $t)) {
            return $n - 1;
        }

        return null;
    }

    /**
     * Extrait une heure dite : retourne [heure, minute|null] ou null.
     */
    private function heure(string $t): ?array
    {
        if (preg_match('/\b(\d{1,2})\s*(?:h|heures?)\s*(\d{2})?/', $t, $m)) {
            return [(int) $m[1], isset($m[2]) && $m[2] !== '' ? (int) $m[2] : null];
        }

        $mots = [
            'dix sept' => 17, 'dix huit' => 18, 'dix neuf' => 19, 'dix' => 10, 'onze' => 11,
            'douze' => 12, 'treize' => 13, 'quatorze' => 14, 'quinze' => 15, 'seize' => 16,
            'sept' => 7, 'huit' => 8, 'neuf' => 9, 'six' => 6,
        ];

        foreach ($mots as $mot => $h) {
            if (preg_match('/\b' . $mot . '\s+heures?\b(\s+et\s+demie?|\s+et\s+quart|\s+trente)?/', $t, $m)) {
                $minute = null;

                if (! empty($m[1])) {
                    $minute = str_contains($m[1], 'quart') ? 15 : 30;
                }

                return [$h, $minute];
            }
        }

        return str_contains($t, 'midi') ? [12, null] : null;
    }

    private function heureCreneau(array $c): array
    {
        preg_match('/^(\d{1,2})h(\d{2})$/', (string) ($c['heure'] ?? ''), $m);

        return [(int) ($m[1] ?? -1), (int) ($m[2] ?? -1)];
    }

    private function jourCreneau(array $c): int
    {
        preg_match('/\b(\d{1,2})\b/', (string) ($c['date'] ?? ''), $m);

        return (int) ($m[1] ?? 0);
    }
}