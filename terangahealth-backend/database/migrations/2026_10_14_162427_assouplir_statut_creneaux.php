<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Laravel crée parfois une contrainte CHECK sur la colonne "status" des créneaux.
        // On la retire pour autoriser la nouvelle valeur "indisponible". Sans effet si elle n'existe pas.
        DB::statement('ALTER TABLE creneaux DROP CONSTRAINT IF EXISTS creneaux_status_check');
    }

    public function down(): void
    {
        // Rien à restaurer : la colonne reste une chaîne de caractères.
    }
};