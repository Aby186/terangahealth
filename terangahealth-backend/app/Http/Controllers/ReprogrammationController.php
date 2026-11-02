<?php

namespace App\Http\Controllers;

use App\Models\RendezVous;
use Illuminate\Http\Request;

class ReprogrammationController extends Controller
{
    /**
     * Liste des rendez-vous à reprogrammer pour la secrétaire et l'admin.
     * Chaque rendez-vous renvoie son créneau et le planning du jour, ce qui permet
     * de savoir si le médecin a bloqué un seul créneau ou désactivé toute la journée.
     * GET /api/alertes/reprogrammation
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (! $user->isSecretaire() && ! $user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $rendezVous = RendezVous::with(['patient', 'medecin', 'service', 'creneau.planning'])
            ->whereIn('status', ['en_attente', 'confirme'])
            ->whereHas('creneau', fn ($query) => $query->where('status', 'indisponible'))
            ->whereDate('date_rendez_vous', '>=', now()->toDateString())
            ->orderBy('date_rendez_vous', 'asc')
            ->orderBy('heure_rendez_vous', 'asc')
            ->get();

        return response()->json([
            'total' => $rendezVous->count(),
            'rendez_vous' => $rendezVous,
        ]);
    }
}