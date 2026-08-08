<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ServiceController extends Controller
{
    /**
     * Liste tous les services médicaux.
     * GET /api/services
     */
    public function index()
    {
        return response()->json(Service::orderBy('nom')->get());
    }

    /**
     * Vérifie que l'utilisateur connecté est bien un administrateur.
     */
    private function verifierAdmin(Request $request): ?\Illuminate\Http\JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Accès réservé à l\'administrateur.'], 403);
        }
        return null;
    }

    /**
     * Crée un nouveau service médical.
     * POST /api/services
     */
    public function store(Request $request)
    {
        if ($refus = $this->verifierAdmin($request)) return $refus;

        $validator = Validator::make($request->all(), [
            'nom'                => 'required|string|max:100|unique:services,nom',
            'description'        => 'required|string',
            'duree_consultation' => 'required|integer|min:5|max:180',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $service = Service::create($request->only(['nom', 'description', 'duree_consultation']));

        return response()->json([
            'message' => 'Service créé avec succès.',
            'service' => $service,
        ], 201);
    }

    /**
     * Modifie un service existant.
     * PUT /api/services/{service}
     */
    public function update(Request $request, Service $service)
    {
        if ($refus = $this->verifierAdmin($request)) return $refus;

        $validator = Validator::make($request->all(), [
            'nom'                => 'sometimes|string|max:100|unique:services,nom,' . $service->id,
            'description'        => 'sometimes|string',
            'duree_consultation' => 'sometimes|integer|min:5|max:180',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $service->update($request->only(['nom', 'description', 'duree_consultation']));

        return response()->json([
            'message' => 'Service mis à jour.',
            'service' => $service,
        ]);
    }

    /**
     * Supprime un service (sauf s'il est encore rattaché à des médecins).
     * DELETE /api/services/{service}
     */
    public function destroy(Request $request, Service $service)
    {
        if ($refus = $this->verifierAdmin($request)) return $refus;

        if ($service->medecins()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer ce service : des médecins y sont encore rattachés.',
            ], 409);
        }

        $service->delete();

        return response()->json(['message' => 'Service supprimé.']);
    }
}