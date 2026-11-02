<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->boolean('supprime_par_expediteur')->default(false)->after('lu');
            $table->boolean('supprime_par_destinataire')->default(false)->after('supprime_par_expediteur');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['supprime_par_expediteur', 'supprime_par_destinataire']);
        });
    }
};