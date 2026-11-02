<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\RendezVous;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CompteController extends Controller
{
    /**
     * Le patient ferme son compte : ses rendez-vous à venir sont annulés (créneaux libérés),
     * ses messages et ses connexions sont supprimés, ses données personnelles sont effacées.
     * Les anciens rendez-vous et paiements restent liés à un compte anonyme.
     * DELETE /api/mon-compte
     */
    public function modifier(Request $request)
    {
        $user = $request->user();

        if (! $user->isPatient()) {
            return response()->json(['message' => 'Seul un patient peut modifier son profil ici.'], 403);
        }

        $donnees = $request->only(['prenom', 'nom', 'telephone', 'adresse', 'date_naissance', 'sexe', 'email']);

        foreach (['role', 'statut', 'code_patient', 'matricule', 'password'] as $champInterdit) {
            unset($donnees[$champInterdit]);
        }

        $validator = Validator::make($donnees, [
            'prenom'         => 'sometimes|required|string|max:100',
            'nom'            => 'sometimes|required|string|max:100',
            'email'          => ['sometimes', 'required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'telephone'      => ['sometimes', 'nullable', 'string', 'max:20', 'regex:/^(?:\+221[0-9]{9}|[0-9]{9})$/'],
            'date_naissance' => 'sometimes|required|date|before:today',
            'sexe'           => 'sometimes|required|in:homme,femme',
            'adresse'        => 'sometimes|required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors' => $validator->errors(),
            ], 422);
        }

        if (array_key_exists('telephone', $donnees) && ! empty($donnees['telephone'])) {
            $chiffres = preg_replace('/\D+/', '', $donnees['telephone']);

            if (strlen($chiffres) === 9) {
                $donnees['telephone'] = '+221' . $chiffres;
            } elseif (strlen($chiffres) === 12 && str_starts_with($chiffres, '221')) {
                $donnees['telephone'] = '+' . $chiffres;
            }
        }

        $user->update($donnees);

        return response()->json([
            'message' => 'Profil mis à jour.',
            'user'    => $user->fresh(),
        ]);
    }

    public function supprimer(Request $request)
    {
        $user = $request->user();

        if (! $user->isPatient()) {
            return response()->json(['message' => 'Seul un patient peut fermer son compte ici.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Données invalides.', 'errors' => $validator->errors()], 422);
        }

        if (! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Mot de passe incorrect.'], 422);
        }

        DB::transaction(function () use ($user) {
            // 1) Rendez-vous à venir : annulés, créneaux libérés.
            $aVenir = RendezVous::with('creneau')
                ->where('patient_id', $user->id)
                ->whereIn('status', ['en_attente', 'confirme'])
                ->whereDate('date_rendez_vous', '>=', now()->toDateString())
                ->get();

            foreach ($aVenir as $rdv) {
                $rdv->update(['status' => 'annule']);

                // Un créneau bloqué par le médecin reste bloqué.
                if ($rdv->creneau && $rdv->creneau->status === 'reserve') {
                    $rdv->creneau->update(['status' => 'disponible']);
                }
            }

            // 2) Messages envoyés et reçus.
            Message::where('expediteur_id', $user->id)
                ->orWhere('destinataire_id', $user->id)
                ->delete();

            // 3) Connexions ouvertes.
            $user->tokens()->delete();

            // 4) Données personnelles anonymisées ; le compte ne peut plus se connecter.
            $user->forceFill([
                'nom'             => 'Compte',
                'prenom'          => 'supprimé',
                'email'           => 'supprime-' . $user->id . '-' . Str::lower(Str::random(6)) . '@anonyme.local',
                'telephone'       => null,
                'date_naissance'  => null,
                'sexe'            => null,
                'adresse'         => null,
                'photo'           => null,
                'langues_parlees' => null,
                'remember_token'  => null,
                'password'        => Hash::make(Str::random(40)),
                'statut'          => 'bloque',
            ])->save();
        });

        Log::info("Compte patient {$user->id} fermé et anonymisé.");

        return response()->json(['message' => 'Votre compte a été fermé et vos données personnelles effacées.']);
    }
}