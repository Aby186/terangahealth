<?php

namespace App\Console\Commands;

use App\Services\SoynadeService;
use Illuminate\Console\Command;

class TraduirePhrasesAssistant extends Command
{
    protected $signature = 'assistant:phrases';

    protected $description = "Traduit en wolof les phrases fixes de l'assistant vocal, pour relecture";

    public function handle(SoynadeService $soynade): int
    {
        $phrases = [
            "Bonjour, je suis l'assistant TerangaHealth. Quelle spécialité souhaitez-vous consulter ?",
            "Je n'ai pas bien entendu. Pouvez-vous répéter ?",
            "Je n'ai pas compris la spécialité. Vous pouvez dire par exemple cardiologie ou médecine générale.",
            "Voici les prochains créneaux disponibles. Lequel choisissez-vous ?",
        ];

        foreach ($phrases as $i => $fr) {
            $this->line(($i + 1) . '. FR : ' . $fr);

            $wo = null;
            for ($essai = 1; $essai <= 2 && ! $wo; $essai++) {
                $wo = $soynade->traduire($fr, 'fr', 'wo');
            }

            $this->line('   WO : ' . ($wo ?? 'ECHEC (voir storage/logs/laravel.log)'));
            $this->newLine();
        }

        return self::SUCCESS;
    }
}