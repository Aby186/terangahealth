<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ServiceController extends Controller
{
    /**
     * Liste tous les services medicaux.
     * GET /api/services
     */
    public function index()
    {
        return response()->json(Service::orderBy('nom')->get());
    }

    /**
     * Verifie que l'utilisateur connecte est bien un administrateur.
     */
    private function verifierAdmin(Request $request): ?\Illuminate\Http\JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => "Acc\u{e8}s r\u{e9}serv\u{e9} \u{e0} l'administrateur."], 403);
        }
        return null;
    }

    /**
     * Cree un nouveau service medical.
     * POST /api/services
     */
    public function store(Request $request)
    {
        if ($refus = $this->verifierAdmin($request)) return $refus;

        $validator = Validator::make($request->all(), [
            'nom'                => 'required|string|max:100|unique:services,nom',
            'description'        => 'required|string',
            'duree_consultation' => 'required|integer|min:5|max:180',
            'tarif'              => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => "Donn\u{e9}es invalides.",
                'errors'  => $validator->errors(),
            ], 422);
        }

        $service = Service::create($request->only(['nom', 'description', 'duree_consultation', 'tarif']));

        return response()->json([
            'message' => "Service cr\u{e9}\u{e9} avec succ\u{e8}s.",
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
            'tarif'              => 'sometimes|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => "Donn\u{e9}es invalides.",
                'errors'  => $validator->errors(),
            ], 422);
        }

        $service->update($request->only(['nom', 'description', 'duree_consultation', 'tarif']));

        return response()->json([
            'message' => "Service mis \u{e0} jour.",
            'service' => $service,
        ]);
    }

    /**
     * Supprime un service (sauf s'il est encore rattache a des medecins).
     * DELETE /api/services/{service}
     */
    public function destroy(Request $request, Service $service)
    {
        if ($refus = $this->verifierAdmin($request)) return $refus;

        if ($service->medecins()->exists()) {
            return response()->json([
                'message' => "Impossible de supprimer ce service : des m\u{e9}decins y sont encore rattach\u{e9}s.",
            ], 409);
        }

        $service->delete();

        return response()->json(['message' => "Service supprim\u{e9}."]);
    }
}