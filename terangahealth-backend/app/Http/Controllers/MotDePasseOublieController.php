<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

class MotDePasseOublieController extends Controller
{
    /**
     * Étape 1 : le patient saisit son e-mail et reçoit un lien de réinitialisation.
     * La réponse est la même que l'e-mail existe ou non, pour ne pas révéler
     * quelles adresses ont un compte.
     */
    public function envoyerLien(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'Veuillez saisir votre adresse e-mail.',
            'email.email' => 'Veuillez saisir une adresse e-mail valide.',
        ]);

        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => 'Si un compte existe avec cette adresse, un lien de réinitialisation vient de lui être envoyé.',
        ]);
    }

    /**
     * Étape 2 : le patient arrive depuis le lien reçu par e-mail et choisit un nouveau mot de passe.
     * Le lien est à usage unique et expire.
     */
    public function reinitialiser(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'password.required' => 'Veuillez saisir un nouveau mot de passe.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
            'password.confirmed' => 'La confirmation ne correspond pas au mot de passe.',
        ]);

        $statut = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                // Le champ password est haché automatiquement (cast « hashed » du modèle)
                $user->forceFill(['password' => $password])->save();

                // Déconnecte tous les appareils où le compte était ouvert
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($statut === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.',
            ]);
        }

        return response()->json([
            'message' => 'Ce lien est invalide ou a expiré. Veuillez refaire une demande.',
        ], 422);
    }
}