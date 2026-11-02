<?php

namespace App\Services;

use App\Models\Creneau;
use App\Models\Service;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class RechercheVocaleService
{
    /**
     * Cherche la spécialité dans le texte français : racine du nom du service
     * ou mots-clés du dictionnaire config/orientation.php (le même que le chatbot).
     */
    public function trouverService(string $texteFr): ?Service
    {
        $texte = Str::lower(Str::ascii($texteFr));
        $dictionnaire = config('orientation', []);

        $meilleur = null;
        $meilleurScore = 0;

        foreach (Service::all() as $service) {
            $nom = Str::lower(Str::ascii($service->nom));
            $racine = str_contains($nom, 'medecine') ? 'general' : substr($nom, 0, 6);
            $score = 0;

            if ($racine !== '' && str_contains($texte, $racine)) {
                $score += 2;
            }

            foreach ($dictionnaire[$service->nom] ?? [] as $motCle) {
                if (str_contains($texte, Str::lower(Str::ascii($motCle)))) {
                    $score += 1;
                    break;
                }
            }

            if ($score > $meilleurScore) {
                $meilleur = $service;
                $meilleurScore = $score;
            }
        }

        return $meilleur;
    }

    /**
     * Les 3 prochains créneaux libres des médecins actifs de ce service.
     */
    public function creneauxProposes(Service $service): array
    {
        $medecins = User::medecins()
            ->where('statut', 'actif')
            ->where('service_id', $service->id)
            ->get()
            ->keyBy('id');

        if ($medecins->isEmpty()) {
            return [];
        }

        $creneaux = Creneau::disponibles()
            ->whereHas('planning', function ($q) use ($medecins) {
                $q->whereIn('medecin_id', $medecins->keys())
                    ->where('status', 'actif')
                    ->whereDate('date_planning', '>=', now()->toDateString());
            })
            ->with('planning')
            ->get()
            ->reject(fn ($c) => Carbon::parse(substr((string) $c->planning->date_planning, 0, 10) . ' ' . $c->heure_debut, config('app.timezone'))->lte(now(config('app.timezone'))))
            ->sortBy(fn ($c) => Carbon::parse($c->planning->date_planning)->format('Y-m-d') . ' ' . $c->heure_debut)
            ->take(3)
            ->values();

        return $creneaux->map(function ($c) use ($medecins) {
            $medecin = $medecins[$c->planning->medecin_id];

            return [
                'creneau_id' => $c->id,
                'medecin_id' => $medecin->id,
                'medecin'    => $medecin->nom,
                'date'       => Carbon::parse($c->planning->date_planning)->locale('fr')->isoFormat('dddd D MMMM'),
                'heure'      => str_replace(':', 'h', substr($c->heure_debut, 0, 5)),
                'heure_dite' => $this->heureDite($c->heure_debut),
            ];
        })->all();
    }

    /**
     * "09:30:00" -> "9 heures 30" (pour être lu à voix haute).
     */
    private function heureDite(string $heureDebut): string
    {
        [$h, $m] = array_map('intval', explode(':', substr($heureDebut, 0, 5)));

        $texte = $h . ($h > 1 ? ' heures' : ' heure');

        return $m > 0 ? $texte . ' ' . $m : $texte;
    }
}