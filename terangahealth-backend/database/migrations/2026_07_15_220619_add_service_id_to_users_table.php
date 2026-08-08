<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // un médecin appartient à un seul service (1,n) — nullable car
            // les patients/secrétaires/admin n'ont pas de service rattaché
            $table->foreignId('service_id')
                  ->nullable()
                  ->after('role')
                  ->constrained('services')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['service_id']);
            $table->dropColumn('service_id');
        });
    }
};