<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('creneaux', function (Blueprint $table) {
            $table->id(); // idCreneau
            $table->foreignId('planning_id')->constrained()->onDelete('cascade');
            $table->string('code_creneau')->unique(); // codeCreneau
            $table->time('heure_debut'); // heureDebut
            $table->time('heure_fin'); // heureFin

            // disponible | reserve | annule
            $table->enum('status', ['disponible', 'reserve', 'annule'])->default('disponible');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('creneaux');
    }
};