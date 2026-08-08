<?php

namespace App\Http\Controllers;

use App\Models\Creneau;
use App\Models\Planning;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Carbon;

class PlanningController extends Controller
{
    /**
     * Liste les plannings d'un médecin (avec leurs créneaux), triés par date.
     * GET /api/plannings?medecin_id=2
     */
    public function index(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'medecin_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Données invalides.', 'errors' => $validator->errors()], 422);
        }

        $plannings = Planning::with('creneaux.rendezVous.patient')
            ->where('medecin_id', $request->medecin_id)
            ->orderBy('date_planning')
            ->get();

        return response()->json($plannings);
    }
    /**
     * Vérifie que l'utilisateur a le droit de gérer le planning de ce médecin :
     * secrétaire/admin peuvent gérer tous les médecins, un médecin ne gère que le sien.
     */
    private function autoriseAGerer(Request $request, int $medecinId): bool
    {
        $user = $request->user();

        if ($user->isSecretaire() || $user->isAdmin()) {
            return true;
        }

        return $user->isMedecin() && $user->id === $medecinId;
    }

    /**
     * Crée un planning (une journée) pour un médecin.
     * POST /api/plannings
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'medecin_id'    => 'required|exists:users,id',
            'date_planning' => 'required|date|after_or_equal:today',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Données invalides.', 'errors' => $validator->errors()], 422);
        }

        if (! $this->autoriseAGerer($request, (int) $request->medecin_id)) {
            return response()->json(['message' => 'Vous ne pouvez gérer que votre propre planning.'], 403);
        }

        $medecin = User::findOrFail($request->medecin_id);

        if (! $medecin->isMedecin()) {
            return response()->json(['message' => 'Cet utilisateur n\'est pas un médecin.'], 422);
        }

        $existe = Planning::where('medecin_id', $request->medecin_id)
            ->where('date_planning', $request->date_planning)
            ->exists();

        if ($existe) {
            return response()->json(['message' => 'Un planning existe déjà pour ce médecin à cette date.'], 409);
        }

        $planning = Planning::create([
            'medecin_id'    => $request->medecin_id,
            'date_planning' => $request->date_planning,
            'status'        => 'actif',
        ]);

        return response()->json([
            'message'  => 'Planning créé avec succès.',
            'planning' => $planning,
        ], 201);
    }

    /**
     * Génère automatiquement une série de créneaux pour un planning donné.
     * POST /api/plannings/{planning}/creneaux
     */
    public function genererCreneaux(Request $request, Planning $planning)
    {
        if (! $this->autoriseAGerer($request, $planning->medecin_id)) {
            return response()->json(['message' => 'Vous ne pouvez gérer que votre propre planning.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'heure_debut'     => 'required|date_format:H:i',
            'heure_fin'       => 'required|date_format:H:i|after:heure_debut',
            'duree_creneau'   => 'required|integer|min:5|max:120',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Données invalides.', 'errors' => $validator->errors()], 422);
        }

        $debut = Carbon::createFromFormat('H:i', $request->heure_debut);
        $fin = Carbon::createFromFormat('H:i', $request->heure_fin);
        $duree = (int) $request->duree_creneau;

        $creneauxCrees = [];
        $curseur = $debut->copy();

        while ($curseur->copy()->addMinutes($duree)->lte($fin)) {
            $creneau = Creneau::create([
                'planning_id' => $planning->id,
                'heure_debut' => $curseur->format('H:i'),
                'heure_fin'   => $curseur->copy()->addMinutes($duree)->format('H:i'),
                'status'      => 'disponible',
            ]);

            $creneauxCrees[] = $creneau;
            $curseur->addMinutes($duree);
        }

        return response()->json([
            'message'   => count($creneauxCrees) . ' créneau(x) créé(s).',
            'creneaux'  => $creneauxCrees,
        ], 201);
    }

    /**
     * Active ou désactive un planning (ex: jour de congé).
     * PUT /api/plannings/{planning}/toggle
     */
    public function toggleStatus(Request $request, Planning $planning)
    {
        if (! $this->autoriseAGerer($request, $planning->medecin_id)) {
            return response()->json(['message' => 'Vous ne pouvez gérer que votre propre planning.'], 403);
        }

        $planning->update([
            'status' => $planning->status === 'actif' ? 'inactif' : 'actif',
        ]);

        return response()->json([
            'message'  => 'Statut du planning mis à jour.',
            'planning' => $planning,
        ]);
    }

    /**
     * Supprime un créneau (uniquement s'il est encore disponible, pas réservé).
     * DELETE /api/creneaux/{creneau}
     */
    public function supprimerCreneau(Request $request, Creneau $creneau)
    {
        $medecinId = $creneau->planning->medecin_id;

        if (! $this->autoriseAGerer($request, $medecinId)) {
            return response()->json(['message' => 'Vous ne pouvez gérer que votre propre planning.'], 403);
        }

        if ($creneau->status === 'reserve') {
            return response()->json(['message' => 'Impossible de supprimer un créneau déjà réservé.'], 409);
        }

        $creneau->delete();

        return response()->json(['message' => 'Créneau supprimé.']);
    }

    /**
     * Supprime un planning entier (et ses créneaux, en cascade), sauf s'il contient
     * des créneaux déjà réservés (pour ne pas perdre de rendez-vous par erreur).
     * DELETE /api/plannings/{planning}
     */
    public function destroy(Request $request, Planning $planning)
    {
        if (! $this->autoriseAGerer($request, $planning->medecin_id)) {
            return response()->json(['message' => 'Vous ne pouvez gérer que votre propre planning.'], 403);
        }

        $aDesCreneauxReserves = $planning->creneaux()->where('status', 'reserve')->exists();

        if ($aDesCreneauxReserves) {
            return response()->json([
                'message' => 'Impossible de supprimer ce planning : il contient des créneaux réservés. Annulez ou reprogrammez ces rendez-vous d\'abord.',
            ], 409);
        }

        $planning->delete();

        return response()->json([
            'message' => 'Planning supprimé.',
        ]);
    }
}