<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
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
     * Liste tous les utilisateurs, avec filtre optionnel par rôle.
     * GET /api/utilisateurs?role=medecin
     */
    public function index(Request $request)
    {
        if ($refus = $this->verifierAdmin($request)) return $refus;

        $query = User::with('service')->orderBy('created_at', 'desc');

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        return response()->json($query->get());
    }

    /**
     * Crée un nouvel utilisateur (médecin, secrétaire ou admin — les patients
     * s'inscrivent eux-mêmes via /register).
     * POST /api/utilisateurs
     */
    public function store(Request $request)
    {
        if ($refus = $this->verifierAdmin($request)) return $refus;

        $validator = Validator::make($request->all(), [
            'nom'            => 'required|string|max:100',
            'prenom'         => 'required|string|max:100',
            'email'          => 'required|email|unique:users,email',
            'telephone'      => 'nullable|string|max:20',
            'password'       => 'required|string|min:6',
            'role'           => 'required|in:medecin,secretaire,administrateur',
            'service_id'     => 'nullable|exists:services,id|required_if:role,medecin',
            'experience'     => 'nullable|integer|min:0',
            'langues_parlees' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'nom'             => $request->nom,
            'prenom'          => $request->prenom,
            'email'           => $request->email,
            'telephone'       => $request->telephone,
            'password'        => Hash::make($request->password),
            'role'            => $request->role,
            'statut'          => 'actif',
            'service_id'      => $request->role === 'medecin' ? $request->service_id : null,
            'experience'      => $request->experience,
            'langues_parlees' => $request->langues_parlees,
        ]);

        return response()->json([
            'message' => 'Utilisateur créé avec succès.',
            'user'    => $user,
        ], 201);
    }

    /**
     * Modifie un utilisateur existant.
     * PUT /api/utilisateurs/{user}
     */
    public function update(Request $request, User $user)
    {
        if ($refus = $this->verifierAdmin($request)) return $refus;

        $validator = Validator::make($request->all(), [
            'nom'            => 'sometimes|string|max:100',
            'prenom'         => 'sometimes|string|max:100',
            'email'          => 'sometimes|email|unique:users,email,' . $user->id,
            'telephone'      => 'nullable|string|max:20',
            'service_id'     => 'nullable|exists:services,id',
            'experience'     => 'nullable|integer|min:0',
            'langues_parlees' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user->update($request->only([
            'nom', 'prenom', 'email', 'telephone', 'service_id', 'experience', 'langues_parlees',
        ]));

        return response()->json([
            'message' => 'Utilisateur mis à jour.',
            'user'    => $user,
        ]);
    }

    /**
     * Active ou bloque un utilisateur.
     * PUT /api/utilisateurs/{user}/toggle-statut
     */
    public function toggleStatut(Request $request, User $user)
    {
        if ($refus = $this->verifierAdmin($request)) return $refus;

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas modifier votre propre statut.'], 409);
        }

        $user->update([
            'statut' => $user->statut === 'actif' ? 'bloque' : 'actif',
        ]);

        return response()->json([
            'message' => 'Statut mis à jour.',
            'user'    => $user,
        ]);
    }

    /**
     * Supprime un utilisateur (jamais un patient ayant des rendez-vous, pour ne pas
     * casser l'historique).
     * DELETE /api/utilisateurs/{user}
     */
    public function destroy(Request $request, User $user)
    {
        if ($refus = $this->verifierAdmin($request)) return $refus;

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 409);
        }

        if ($user->isPatient() && $user->rendezVousPatient()->exists()) {
            return response()->json(['message' => 'Impossible de supprimer ce patient : il a des rendez-vous enregistrés.'], 409);
        }

        if ($user->isMedecin() && $user->rendezVousMedecin()->exists()) {
            return response()->json(['message' => 'Impossible de supprimer ce médecin : il a des rendez-vous enregistrés.'], 409);
        }

        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    /**
     * Change le mot de passe de l'utilisateur connecté.
     * PUT /api/mon-mot-de-passe
     */
    public function changerMotDePasse(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'mot_de_passe_actuel'  => 'required|string',
            'nouveau_mot_de_passe' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Données invalides.', 'errors' => $validator->errors()], 422);
        }

        $user = $request->user();

        if (! Hash::check($request->mot_de_passe_actuel, $user->password)) {
            return response()->json(['message' => 'Mot de passe actuel incorrect.'], 401);
        }

        $user->update(['password' => Hash::make($request->nouveau_mot_de_passe)]);

        return response()->json(['message' => 'Mot de passe modifié avec succès.']);
    }
    /**
     * Réinitialise le mot de passe d'un autre utilisateur (admin uniquement,
     * sans avoir besoin de connaître son ancien mot de passe).
     * PUT /api/utilisateurs/{user}/reinitialiser-mot-de-passe
     */
    public function reinitialiserMotDePasse(Request $request, User $user)
    {
        if ($refus = $this->verifierAdmin($request)) return $refus;

        $validator = Validator::make($request->all(), [
            'nouveau_mot_de_passe' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Données invalides.', 'errors' => $validator->errors()], 422);
        }

        $user->update(['password' => Hash::make($request->nouveau_mot_de_passe)]);

        return response()->json(['message' => "Mot de passe de {$user->prenom} {$user->nom} réinitialisé avec succès."]);
    }
}