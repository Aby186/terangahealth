<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plannings', function (Blueprint $table) {
            $table->id(); // idPlanning
            $table->foreignId('medecin_id')->constrained('users')->onDelete('cascade');
            $table->date('date_planning'); // datePlanning
            $table->enum('status', ['actif', 'inactif'])->default('actif'); // status
            $table->timestamps();

            $table->unique(['medecin_id', 'date_planning']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plannings');
    }
};