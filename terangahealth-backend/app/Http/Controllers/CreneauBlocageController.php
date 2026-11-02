<?php

namespace App\Http\Controllers;

use App\Models\Creneau;
use App\Models\RendezVous;
use App\Services\AlerteBlocageService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class CreneauBlocageController extends Controller
{
    public function __construct(private AlerteBlocageService $alerte)
    {
    }

    /**
     * La date du planning peut arriver avec une heure (2026-10-23 00:00:00) :
     * on ne garde que AAAA-MM-JJ avant de la comparer à aujourd'hui.
     */
    private function estJourneePassee(mixed $datePlanning): bool
    {
        $timezone = config('app.timezone', 'UTC');
        $jour = substr((string) $datePlanning, 0, 10);
        $date = Carbon::createFromFormat('!Y-m-d', $jour, $timezone);

        return $date->lt(Carbon::now($timezone)->startOfDay());
    }

    /**
     * Bloque ou débloque un créneau : le médecin est absent à cette heure-là, pas toute la journée.
     * Si un rendez-vous est déjà pris, le patient et la secrétaire sont prévenus.
     * PUT /api/creneaux/{creneau}/bloquer
     */
    public function basculer(Request $request, Creneau $creneau)
    {
        $user = $request->user();

        if (! ($user->isAdmin() || ($user->isMedecin() && $user->id === $creneau->planning->medecin_id))) {
            return response()->json(['message' => 'Vous ne pouvez gérer que votre propre planning.'], 403);
        }

        if ($this->estJourneePassee($creneau->planning->date_planning)) {
            return response()->json(['message' => 'Cette journée est déjà passée.'], 422);
        }

        $rdvsActifs = RendezVous::where('creneau_id', $creneau->id)
            ->whereIn('status', ['en_attente', 'confirme'])
            ->get();

        $rdvActif = $rdvsActifs->isNotEmpty();

        if ($creneau->status === 'indisponible') {
            // Requête directe : elle contourne la protection du modèle, qui interdit de rouvrir un créneau bloqué.
            Creneau::where('id', $creneau->id)->update(['status' => $rdvActif ? 'reserve' : 'disponible']);
            $message = 'Créneau activé.';
        } else {
            $creneau->update(['status' => 'indisponible']);
            $message = $rdvActif
                ? 'Créneau désactivé. Le patient et la secrétaire ont été prévenus ; le rendez-vous doit être reprogrammé.'
                : 'Créneau désactivé.';

            foreach ($rdvsActifs as $rdv) {
                $this->alerte->prevenir($rdv);
            }
        }

        $creneau = $creneau->fresh();

        return response()->json([
            'message'        => $message,
            'creneau'        => $creneau,
            'a_reprogrammer' => $rdvActif && $creneau->status === 'indisponible',
        ]);
    }
}