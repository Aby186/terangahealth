<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\ListeAttenteController;
use App\Http\Controllers\PlanningController;
use App\Http\Controllers\RendezVousController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/medecins', [RendezVousController::class, 'listerMedecins']);
Route::get('/medecins/{medecin}/creneaux', [RendezVousController::class, 'getCreneauxDisponibles']);
Route::get('/services', [ServiceController::class, 'index']);

Route::get('/rendez-vous/{rendezVous}/annuler-lien', [RendezVousController::class, 'annulerParLien'])
    ->name('rendezvous.annuler.lien')
    ->middleware('signed');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::put('/utilisateurs/{user}/reinitialiser-mot-de-passe', [UserController::class, 'reinitialiserMotDePasse']);
    Route::post('/rendez-vous', [RendezVousController::class, 'store']);
    Route::get('/rendez-vous', [RendezVousController::class, 'index']);
    Route::put('/rendez-vous/{rendezVous}/confirm', [RendezVousController::class, 'confirm']);
    Route::put('/rendez-vous/{rendezVous}/cancel', [RendezVousController::class, 'cancel']);
    Route::put('/rendez-vous/{rendezVous}/reprogrammer', [RendezVousController::class, 'reprogrammer']);
    Route::delete('/rendez-vous/{rendezVous}', [RendezVousController::class, 'destroy']);

    Route::post('/liste-attente', [ListeAttenteController::class, 'store']);
    Route::get('/liste-attente', [ListeAttenteController::class, 'index']);
    Route::delete('/liste-attente/{listeAttente}', [ListeAttenteController::class, 'destroy']);

    Route::get('/plannings', [PlanningController::class, 'index']);
    Route::post('/plannings', [PlanningController::class, 'store']);
    Route::post('/plannings/{planning}/creneaux', [PlanningController::class, 'genererCreneaux']);
    Route::put('/plannings/{planning}/toggle', [PlanningController::class, 'toggleStatus']);
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

    Route::post('/chatbot/orienter', [ChatbotController::class, 'orienter']);
});