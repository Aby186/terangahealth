<?php

use App\Http\Controllers\AssistantVocalController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\CompteController;
use App\Http\Controllers\CreneauBlocageController;
use App\Http\Controllers\MotDePasseOublieController;
use App\Http\Controllers\PlanningController;
use App\Http\Controllers\RendezVousController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationReprogrammationController;
use App\Http\Controllers\PaiementController;
use App\Http\Controllers\ReprogrammationController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Mot de passe oublié : l'utilisateur gère lui-même sa réinitialisation (5 essais par minute)
Route::post('/mot-de-passe-oublie', [MotDePasseOublieController::class, 'envoyerLien'])
    ->middleware('throttle:5,1');
Route::post('/reinitialiser-mot-de-passe', [MotDePasseOublieController::class, 'reinitialiser'])
    ->middleware('throttle:5,1');

Route::get('/medecins', [RendezVousController::class, 'listerMedecins']);
Route::get('/medecins/{medecin}/creneaux', [RendezVousController::class, 'getCreneauxDisponibles']);
Route::get('/services', [ServiceController::class, 'index']);

Route::get('/rendez-vous/{rendezVous}/annuler-lien', [RendezVousController::class, 'annulerParLien'])
    ->name('rendezvous.annuler.lien')
    ->middleware('signed');

Route::post('/paydunya/ipn', [PaiementController::class, 'ipn']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/paiements/{paiement}/statut', [PaiementController::class, 'statut']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/mon-compte', [CompteController::class, 'modifier']);
    Route::delete('/mon-compte', [CompteController::class, 'supprimer']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/rendez-vous', [RendezVousController::class, 'store']);
    Route::get('/rendez-vous', [RendezVousController::class, 'index']);
    Route::put('/rendez-vous/{rendezVous}/confirm', [RendezVousController::class, 'confirm']);
    Route::put('/rendez-vous/{rendezVous}/cancel', [RendezVousController::class, 'cancel']);
    Route::put('/rendez-vous/{rendezVous}/reprogrammer', [RendezVousController::class, 'reprogrammer']);
    Route::post('/rendez-vous/{rendezVous}/notifier-reprogrammation', [NotificationReprogrammationController::class, 'notifier']);
    Route::delete('/rendez-vous/{rendezVous}', [RendezVousController::class, 'destroy']);

    Route::get('/plannings', [PlanningController::class, 'index']);
    Route::post('/plannings', [PlanningController::class, 'store']);
    Route::post('/plannings/{planning}/creneaux', [PlanningController::class, 'genererCreneaux']);
    Route::put('/plannings/{planning}/toggle', [PlanningController::class, 'toggleStatus']);
    Route::put('/creneaux/{creneau}/bloquer', [CreneauBlocageController::class, 'basculer']);
    Route::delete('/creneaux/{creneau}', [PlanningController::class, 'supprimerCreneau']);
    Route::delete('/plannings/{planning}', [PlanningController::class, 'destroy']);

    Route::get('/utilisateurs', [UserController::class, 'index']);
    Route::post('/utilisateurs', [UserController::class, 'store']);
    Route::put('/utilisateurs/{user}', [UserController::class, 'update']);
    Route::put('/utilisateurs/{user}/toggle-statut', [UserController::class, 'toggleStatut']);
    Route::delete('/utilisateurs/{user}', [UserController::class, 'destroy']);
    Route::put('/mon-mot-de-passe', [UserController::class, 'changerMotDePasse']);

    Route::post('/services', [ServiceController::class, 'store']);
    Route::put('/services/{service}', [ServiceController::class, 'update']);
    Route::delete('/services/{service}', [ServiceController::class, 'destroy']);

    Route::post('/messages', [MessageController::class, 'store']);
    Route::get('/messages', [MessageController::class, 'index']);
    Route::get('/messages/conversations', [MessageController::class, 'conversations']);
    Route::get('/messages/contacts', [MessageController::class, 'contacts']);
    Route::put('/messages/{message}/marquer-lu', [MessageController::class, 'marquerLu']);
    Route::put('/messages/{message}', [MessageController::class, 'update']);
    Route::delete('/messages/conversation/{userId}', [MessageController::class, 'supprimerConversation']);
    Route::delete('/messages/{message}', [MessageController::class, 'destroy']);

    Route::post('/chatbot/orienter', [ChatbotController::class, 'orienter']);
    Route::post('/assistant-vocal/converser', [AssistantVocalController::class, 'converser']);
    Route::get('/alertes/reprogrammation', [ReprogrammationController::class, 'index']);

    Route::post('/paiements/initier', [PaiementController::class, 'initier']);
    Route::get('/paiements/historique', [PaiementController::class, 'historique']);
});