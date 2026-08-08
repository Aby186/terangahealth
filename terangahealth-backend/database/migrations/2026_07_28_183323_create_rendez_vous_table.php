<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rendez_vous', function (Blueprint $table) {
            $table->id();
            $table->string('numero_rendez_vous')->unique();

            $table->foreignId('patient_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('medecin_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('service_id')->constrained()->onDelete('cascade');
            $table->foreignId('creneau_id')->constrained('creneaux')->onDelete('cascade');

            $table->text('motif');
            $table->date('date_rendez_vous');
            $table->time('heure_rendez_vous');

            $table->enum('status', ['en_attente', 'confirme', 'annule'])->default('en_attente');

            $table->boolean('urgent')->default(false);
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rendez_vous');
    }
};