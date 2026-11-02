<?php

namespace App\Http\Controllers;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MessageController extends Controller
{
    /**
     * Envoie un nouveau message.
     * POST /api/messages
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'destinataire_id' => 'required|exists:users,id',
            'contenu'         => 'required|string|min:1|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        if ((int) $request->destinataire_id === $request->user()->id) {
            return response()->json([
                'message' => 'Vous ne pouvez pas vous envoyer un message à vous-même.',
            ], 422);
        }

        $message = Message::create([
            'expediteur_id'    => $request->user()->id,
            'destinataire_id'  => $request->destinataire_id,
            'contenu'          => $request->contenu,
            'lu'               => false,
        ]);

        return response()->json([
            'message_envoye' => $message->load(['expediteur', 'destinataire']),
        ], 201);
    }

    /**
     * Liste tous les messages (envoyés + reçus) de l'utilisateur connecté,
     * optionnellement filtrés sur une conversation avec un interlocuteur précis.
     * GET /api/messages?avec=5
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $query = Message::with(['expediteur', 'destinataire'])
            ->where(function ($q) use ($userId) {
                $q->where(function ($q2) use ($userId) {
                    $q2->where('expediteur_id', $userId)->where('supprime_par_expediteur', false);
                })->orWhere(function ($q2) use ($userId) {
                    $q2->where('destinataire_id', $userId)->where('supprime_par_destinataire', false);
                });
            })
            ->orderBy('created_at', 'asc');

        if ($request->filled('avec')) {
            $autreId = $request->avec;
            $query->where(function ($q) use ($userId, $autreId) {
                $q->where(function ($q2) use ($userId, $autreId) {
                    $q2->where('expediteur_id', $userId)->where('destinataire_id', $autreId);
                })->orWhere(function ($q2) use ($userId, $autreId) {
                    $q2->where('expediteur_id', $autreId)->where('destinataire_id', $userId);
                });
            });
        }

        return response()->json($query->get());
    }

    /**
     * Marque un message comme lu (uniquement si l'utilisateur connecté en est le destinataire).
     * PUT /api/messages/{message}/marquer-lu
     */
    public function marquerLu(Request $request, Message $message)
    {
        if ($message->destinataire_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Vous ne pouvez marquer comme lu que vos propres messages reçus.',
            ], 403);
        }

        $message->update(['lu' => true]);

        return response()->json(['message' => 'Message marqué comme lu.']);
    }

    /**
     * Liste les interlocuteurs distincts avec qui l'utilisateur connecté a échangé,
     * avec le nombre de messages non lus par conversation.
     * GET /api/messages/conversations
     */
    public function conversations(Request $request)
    {
        $userId = $request->user()->id;

        $messages = Message::with(['expediteur', 'destinataire'])
            ->where(function ($q) use ($userId) {
                $q->where(function ($q2) use ($userId) {
                    $q2->where('expediteur_id', $userId)->where('supprime_par_expediteur', false);
                })->orWhere(function ($q2) use ($userId) {
                    $q2->where('destinataire_id', $userId)->where('supprime_par_destinataire', false);
                });
            })
            ->orderBy('created_at', 'desc')
            ->get();

        $conversations = [];

        foreach ($messages as $msg) {
            $interlocuteur = $msg->expediteur_id === $userId ? $msg->destinataire : $msg->expediteur;

            if (! isset($conversations[$interlocuteur->id])) {
                $conversations[$interlocuteur->id] = [
                    'utilisateur'    => $interlocuteur,
                    'dernier_message' => $msg->contenu,
                    'date'            => $msg->created_at,
                    'non_lus'         => 0,
                ];
            }

            if ($msg->destinataire_id === $userId && ! $msg->lu) {
                $conversations[$interlocuteur->id]['non_lus']++;
            }
        }

        return response()->json(array_values($conversations));
    }

    /**
     * Liste les contacts qu'un utilisateur peut contacter, selon la matrice
     * de communication définie : Patient <-> Secrétaire/Médecin,
     * Médecin <-> Secrétaire/Admin/Patient, Secrétaire/Admin <-> tout le monde.
     * Patient <-> Admin n'est jamais autorisé (aucun besoin métier identifié).
     * GET /api/messages/contacts
     */
    public function contacts(Request $request)
    {
        $user = $request->user();

        if ($user->isPatient()) {
            $contacts = \App\Models\User::whereIn('role', ['secretaire', 'medecin'])
                ->where('statut', 'actif')
                ->get(['id', 'nom', 'prenom', 'role']);
        } elseif ($user->isMedecin()) {
            $contacts = \App\Models\User::whereIn('role', ['secretaire', 'administrateur', 'patient'])
                ->where('statut', 'actif')
                ->get(['id', 'nom', 'prenom', 'role']);
        } else {
            // secrétaire et admin peuvent contacter tout le monde
            $contacts = \App\Models\User::where('id', '!=', $user->id)
                ->where('statut', 'actif')
                ->get(['id', 'nom', 'prenom', 'role']);
        }

        return response()->json($contacts);
    }

    /**
     * Supprime un message (l'un ou l'autre participant de la conversation peut le faire).
     * DELETE /api/messages/{message}
     */
    public function destroy(Request $request, Message $message)
    {
        $userId = $request->user()->id;

        if ($message->expediteur_id !== $userId && $message->destinataire_id !== $userId) {
            return response()->json([
                'message' => 'Vous ne pouvez supprimer que les messages de vos propres conversations.',
            ], 403);
        }

        if ($message->expediteur_id === $userId) {
            $message->update(['supprime_par_expediteur' => true]);
        } else {
            $message->update(['supprime_par_destinataire' => true]);
        }

        if ($message->supprime_par_expediteur && $message->supprime_par_destinataire) {
            $message->delete();
        }

        return response()->json(['message' => 'Message supprimé.']);
    }

    /**
     * Modifie le contenu d'un message (uniquement son propre message envoyé).
     * PUT /api/messages/{message}
     */
    public function update(Request $request, Message $message)
    {
        if ($message->expediteur_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Vous ne pouvez modifier que vos propres messages.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'contenu' => 'required|string|min:1|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Données invalides.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $message->update(['contenu' => $request->contenu]);

        return response()->json([
            'message_modifie' => $message->load(['expediteur', 'destinataire']),
        ]);
    }

    /**
     * Supprime l'intégralité d'une conversation (tous les messages échangés
     * avec un interlocuteur précis, dans les deux sens).
     * DELETE /api/messages/conversation/{userId}
     */
    public function supprimerConversation(Request $request, int $userId)
    {
        $moi = $request->user()->id;

        $messages = Message::where(function ($q) use ($moi, $userId) {
            $q->where('expediteur_id', $moi)->where('destinataire_id', $userId);
        })->orWhere(function ($q) use ($moi, $userId) {
            $q->where('expediteur_id', $userId)->where('destinataire_id', $moi);
        })->get();

        foreach ($messages as $message) {
            if ($message->expediteur_id === $moi) {
                $message->update(['supprime_par_expediteur' => true]);
            } else {
                $message->update(['supprime_par_destinataire' => true]);
            }

            if ($message->supprime_par_expediteur && $message->supprime_par_destinataire) {
                $message->delete();
            }
        }

        return response()->json(['message' => 'Conversation supprimée.']);
    }
}