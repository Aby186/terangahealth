<?php

namespace App\Console\Commands;

use App\Models\ListeAttente;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class ExpirerListeAttente extends Command
{
    protected $signature = 'liste-attente:expirer';

    protected $description = 'Fait expirer les inscriptions de liste d\'attente trop anciennes ou dont la date souhaitée est dépassée';

    public function handle(): int
    {
        $expirees = 0;

        // Cas 1 : date souhaitée précisée et déjà dépassée
        $parDateDepassee = ListeAttente::where('statut', 'en_attente')
            ->whereNotNull('date_souhaitee')
            ->where('date_souhaitee', '<', Carbon::today())
            ->update(['statut' => 'expire']);

        // Cas 2 : aucune date précisée, mais inscription vieille de plus de 30 jours
        $parAnciennete = ListeAttente::where('statut', 'en_attente')
            ->whereNull('date_souhaitee')
            ->where('created_at', '<', Carbon::now()->subDays(30))
            ->update(['statut' => 'expire']);

        $expirees = $parDateDepassee + $parAnciennete;

        $this->info("{$expirees} inscription(s) expirée(s).");

        return self::SUCCESS;
    }
}