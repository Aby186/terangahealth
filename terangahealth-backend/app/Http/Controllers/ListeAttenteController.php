<?php

namespace App\Http\Controllers;

use App\Models\ListeAttente;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ListeAttenteController extends Controller
{
    /**
     * Inscrit un patient sur la liste d'attente d'un service (et optionnellement d'un médecin précis).
     * POST /api/liste-attente
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'service_id'     => 'required|exists:services,id',
            'medecin_id'     => 'nullable|exists:users,id',
            'date_souhaitee' => 'nullable|date|after_or_equal:today',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $patient = $request->user();

        $dejaInscrit = ListeAttente::where('patient_id', $patient->id)
            ->where('service_id', $request->service_id)
            ->where('medecin_id', $request->medecin_id)
            ->where('statut', 'en_attente')
            ->exists();

        if ($dejaInscrit) {
            return response()->json([
                'message' => 'Vous êtes déjà inscrit sur cette liste d\'attente.',
            ], 409);
        }

        $inscription = ListeAttente::create([
            'patient_id'     => $patient->id,
            'service_id'     => $request->service_id,
            'medecin_id'     => $request->medecin_id,
            'date_souhaitee' => $request->date_souhaitee,
            'statut'         => 'en_attente',
        ]);

        return response()->json([
            'message'       => 'Vous avez été inscrit sur la liste d\'attente. Vous serez notifié dès qu\'un créneau se libère.',
            'liste_attente' => $inscription->load(['service', 'medecin']),
        ], 201);
    }

    /**
     * Liste les inscriptions du patient connecté à la liste d'attente.
     * GET /api/liste-attente
     */
    public function index(Request $request)
    {
        $inscriptions = ListeAttente::with(['service', 'medecin'])
            ->where('patient_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($inscriptions);
    }

    /**
     * Retire une inscription de la liste d'attente (le patient change d'avis).
     * DELETE /api/liste-attente/{listeAttente}
     */
    public function destroy(Request $request, ListeAttente $listeAttente)
    {
        if ($listeAttente->patient_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Vous n\'êtes pas autorisé à retirer cette inscription.',
            ], 403);
        }

        $listeAttente->delete();

        return response()->json([
            'message' => 'Inscription retirée de la liste d\'attente.',
        ]);
    }
}