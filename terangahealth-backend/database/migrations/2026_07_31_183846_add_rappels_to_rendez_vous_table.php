<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rendez_vous', function (Blueprint $table) {
            $table->boolean('rappel_48h_envoye')->default(false);
            $table->boolean('rappel_24h_envoye')->default(false);
            $table->boolean('rappel_jourj_envoye')->default(false);
            $table->boolean('rappel_2h_envoye')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('rendez_vous', function (Blueprint $table) {
            $table->dropColumn([
                'rappel_48h_envoye',
                'rappel_24h_envoye',
                'rappel_jourj_envoye',
                'rappel_2h_envoye',
            ]);
        });
    }
};