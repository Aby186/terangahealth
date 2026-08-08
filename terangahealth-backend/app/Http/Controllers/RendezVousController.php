<?php

namespace App\Http\Controllers;

use App\Models\Creneau;
use App\Models\RendezVous;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RendezVousController extends Controller
{
    /**
     * Liste les créneaux disponibles d'un médecin, optionnellement filtrés par date.
     * GET /api/medecins/{medecin}/creneaux?date=2026-08-01
     */
    public function getCreneauxDisponibles(Request $request, User $medecin)
    {
        if (! $medecin->isMedecin()) {
            return response()->json([
                'message' => 'Cet utilisateur n\'est pas un médecin.',
            ], 422);
        }

        $query = Creneau::disponibles()
            ->whereHas('planning', function ($q) use ($medecin, $request) {
                $q->where('medecin_id', $medecin->id)
                  ->where('status', 'actif');

                if ($request->filled('date')) {
                    $q->whereDate('date_planning', $request->date);
                }
            })
            ->with('planning')
            ->orderBy('heure_debut');

        return response()->json($query->get());
    }

    /**
     * Liste tous les médecins actifs, avec leur service.
     * GET /api/medecins
     */
    public function listerMedecins()
    {
        $medecins = User::medecins()
            ->where('statut', 'actif')
            ->with('service')
            ->get();

        return response()->json($medecins);
    }

    /**
     * Crée un nouveau rendez-vous.
     * POST /api/rendez-vous
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'medecin_id' => 'required|exists:users,id',
            'creneau_id' => 'required|exists:creneaux,id',
            'motif'      => 'required|string|min:10',
            'notes'      => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $medecin = User::findOrFail($request->medecin_id);

        if (! $medecin->isMedecin()) {
            return response()->json([
                'message' => 'L\'utilisateur sélectionné n\'est pas un médecin.',
            ], 422);
        }

        if (! $medecin->service) {
            return response()->json([
                'message' => 'Ce médecin n\'a pas de service rattaché.',
            ], 422);
        }

        $creneau = Creneau::with('planning')->findOrFail($request->creneau_id);

        if ($creneau->status !== 'disponible') {
            return response()->json([
                'message' => 'Ce créneau n\'est plus disponible.',
            ], 409);
        }

        $service = $medecin->service;

        $rendezVous = RendezVous::create([
            'patient_id'         => $request->user()->id,
            'medecin_id'         => $medecin->id,
            'service_id'         => $service->id,
            'creneau_id'         => $creneau->id,
            'motif'              => $request->motif,
            'notes'              => $request->notes,
            'date_rendez_vous'   => $creneau->planning->date_planning,
            'heure_rendez_vous'  => $creneau->heure_debut,
            'status'             => 'en_attente',
            'urgent'             => RendezVous::detecterUrgence($request->motif, $service->nom),
        ]);

        $creneau->update(['status' => 'reserve']);

        return response()->json([
            'message'     => 'Rendez-vous créé avec succès.',
            'rendez_vous' => $rendezVous->load(['medecin', 'service', 'creneau']),
        ], 201);
    }

    /**
     * Liste les rendez-vous, adaptée au rôle de l'utilisateur connecté.
     * GET /api/rendez-vous?status=en_attente&date=2026-08-01
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = RendezVous::with(['patient', 'medecin', 'service', 'creneau'])
            ->orderBy('date_rendez_vous', 'desc')
            ->orderBy('heure_rendez_vous', 'desc');

        if ($user->isPatient()) {
            $query->where('patient_id', $user->id);
        } elseif ($user->isMedecin()) {
            $query->where('medecin_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date')) {
            $query->whereDate('date_rendez_vous', $request->date);
        }

        return response()->json($query->get());
    }

    /**
     * Confirme un rendez-vous en attente.
     * PUT /api/rendez-vous/{rendezVous}/confirm
     */
    public function confirm(Request $request, RendezVous $rendezVous)
    {
        $user = $request->user();

        if (! $user->isSecretaire() && ! $user->isAdmin() && ! ($user->isMedecin() && $rendezVous->medecin_id === $user->id)) {
            return response()->json([
                'message' => 'Vous n\'êtes pas autorisé à confirmer ce rendez-vous.',
            ], 403);
        }

        if ($rendezVous->status !== 'en_attente') {
            return response()->json([
                'message' => 'Ce rendez-vous n\'est plus en attente.',
            ], 409);
        }

        $rendezVous->update(['status' => 'confirme']);

        return response()->json([
            'message'     => 'Rendez-vous confirmé.',
            'rendez_vous' => $rendezVous->load(['patient', 'medecin', 'service', 'creneau']),
        ]);
    }

    /**
     * Annule un rendez-vous (patient concerné, secrétaire, admin, ou médecin concerné).
     * PUT /api/rendez-vous/{rendezVous}/cancel
     */
    public function cancel(Request $request, RendezVous $rendezVous)
    {
        $user = $request->user();

        $estAutorise = $user->isSecretaire()
            || $user->isAdmin()
            || ($user->isPatient() && $rendezVous->patient_id === $user->id)
            || ($user->isMedecin() && $rendezVous->medecin_id === $user->id);

        if (! $estAutorise) {
            return response()->json([
                'message' => 'Vous n\'êtes pas autorisé à annuler ce rendez-vous.',
            ], 403);
        }

        if ($rendezVous->status === 'annule') {
            return response()->json([
                'message' => 'Ce rendez-vous est déjà annulé.',
            ], 409);
        }

        $rendezVous->update(['status' => 'annule']);

        $rendezVous->creneau->update(['status' => 'disponible']);

        $this->notifierListeAttente($rendezVous->creneau, $rendezVous->service_id, $rendezVous->medecin_id, $rendezVous->patient_id);

        return response()->json([
            'message'     => 'Rendez-vous annulé.',
            'rendez_vous' => $rendezVous->load(['patient', 'medecin', 'service', 'creneau']),
        ]);
    }

    /**
     * Reprogramme un rendez-vous sur un nouveau créneau (secrétaire/admin/médecin concerné).
     * PUT /api/rendez-vous/{rendezVous}/reprogrammer
     */
    public function reprogrammer(Request $request, RendezVous $rendezVous)
    {
        $user = $request->user();

        if (! $user->isSecretaire() && ! $user->isAdmin() && ! ($user->isMedecin() && $rendezVous->medecin_id === $user->id)) {
            return response()->json([
                'message' => 'Vous n\'êtes pas autorisé à reprogrammer ce rendez-vous.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'creneau_id' => 'required|exists:creneaux,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        if ($rendezVous->status === 'annule') {
            return response()->json([
                'message' => 'Impossible de reprogrammer un rendez-vous annulé.',
            ], 409);
        }

        $nouveauCreneau = Creneau::with('planning')->findOrFail($request->creneau_id);

        if ($nouveauCreneau->status !== 'disponible') {
            return response()->json([
                'message' => 'Ce créneau n\'est plus disponible.',
            ], 409);
        }

        $ancienCreneau = $rendezVous->creneau;

        $ancienCreneau->update(['status' => 'disponible']);
        $this->notifierListeAttente($ancienCreneau, $rendezVous->service_id, $rendezVous->medecin_id, $rendezVous->patient_id);

        $nouveauCreneau->update(['status' => 'reserve']);

        $rendezVous->update([
            'creneau_id'        => $nouveauCreneau->id,
            'date_rendez_vous'  => $nouveauCreneau->planning->date_planning,
            'heure_rendez_vous' => $nouveauCreneau->heure_debut,
            'status'            => 'en_attente',
        ]);

        return response()->json([
            'message'     => 'Rendez-vous reprogrammé avec succès.',
            'rendez_vous' => $rendezVous->load(['patient', 'medecin', 'service', 'creneau']),
        ]);
    }

    /**
     * Annulation via le lien signé envoyé par email/SMS (sans authentification,
     * la signature de l'URL prouve l'authenticité de la demande).
     * GET /api/rendez-vous/{rendezVous}/annuler-lien?signature=...
     */
    public function annulerParLien(RendezVous $rendezVous)
    {
        if ($rendezVous->status === 'annule') {
            return response()->json([
                'message' => 'Ce rendez-vous est déjà annulé.',
            ], 409);
        }

        $rendezVous->update(['status' => 'annule']);
        $rendezVous->creneau->update(['status' => 'disponible']);

        $this->notifierListeAttente($rendezVous->creneau, $rendezVous->service_id, $rendezVous->medecin_id, $rendezVous->patient_id);

        return response()->json([
            'message' => 'Votre rendez-vous a bien été annulé.',
        ]);
    }

    /**
     * Supprime définitivement un rendez-vous annulé (nettoyage, secrétaire/admin uniquement).
     * DELETE /api/rendez-vous/{rendezVous}
     */
    public function destroy(Request $request, RendezVous $rendezVous)
    {
        $user = $request->user();

        if (! $user->isSecretaire() && ! $user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        if ($rendezVous->status !== 'annule') {
            return response()->json(['message' => 'Seuls les rendez-vous annulés peuvent être supprimés.'], 409);
        }

        $rendezVous->delete();

        return response()->json(['message' => 'Rendez-vous supprimé.']);
    }

    /**
     * Notifie le premier patient en attente (par ordre d'inscription) pour ce service/médecin,
     * en excluant celui qui vient d'annuler.
     */
    private function notifierListeAttente(\App\Models\Creneau $creneau, int $serviceId, int $medecinId, int $patientQuiAnnule): void
    {
        $premierEnAttente = \App\Models\ListeAttente::where('service_id', $serviceId)
            ->where('statut', 'en_attente')
            ->where('patient_id', '!=', $patientQuiAnnule)
            ->where(function ($q) use ($medecinId) {
                $q->whereNull('medecin_id')
                  ->orWhere('medecin_id', $medecinId);
            })
            ->orderBy('created_at', 'asc')
            ->first();

        if (! $premierEnAttente) {
            return;
        }

        $premierEnAttente->patient->notify(new \App\Notifications\CreneauLibere($creneau));
        $premierEnAttente->update(['statut' => 'notifie']);
    }
}