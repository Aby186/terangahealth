<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // ---- attributs communs de la classe Utilisateur ----
            $table->string('nom');
            $table->string('prenom');
            $table->date('date_naissance')->nullable();
            $table->enum('sexe', ['homme', 'femme'])->nullable();
            $table->string('telephone')->nullable();
            $table->string('email')->unique();
            $table->string('photo')->nullable();
            $table->enum('statut', ['actif', 'bloque'])->default('actif');
            $table->string('matricule')->nullable()->unique();
            $table->string('password'); // motdepasse
            $table->string('adresse')->nullable();

            // discriminant de rôle (implémentation de l'héritage Utilisateur -> sous-classes)
            $table->enum('role', ['patient', 'medecin', 'secretaire', 'administrateur'])
                  ->default('patient');

            // ---- attributs spécifiques à Medecin ----
            $table->unsignedInteger('experience')->nullable();
            $table->string('langues_parlees')->nullable();

            // ---- attribut spécifique à Patient ----
            $table->string('code_patient')->nullable()->unique();

            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};