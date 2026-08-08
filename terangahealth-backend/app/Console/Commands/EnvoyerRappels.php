<?php

namespace App\Console\Commands;

use App\Models\RendezVous;
use App\Notifications\RappelRendezVous;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class EnvoyerRappels extends Command
{
    protected $signature = 'rappels:envoyer';

    protected $description = 'Envoie les rappels de rendez-vous (48h, 24h, jour J, 2h avant) par email';

    public function handle(): int
    {
        $maintenant = Carbon::now();

        $rendezVousAVenir = RendezVous::with(['patient', 'medecin'])
            ->where('status', 'confirme')
            ->where('date_rendez_vous', '>=', $maintenant->toDateString())
            ->get();

        $envoyes = 0;

        foreach ($rendezVousAVenir as $rdv) {
            $dateHeureRdv = Carbon::parse($rdv->date_rendez_vous->toDateString() . ' ' . $rdv->heure_rendez_vous);
            $heuresRestantes = $maintenant->diffInHours($dateHeureRdv, false);

            // false = on autorise les nombres négatifs (RDV déjà passé, on ignore alors)
            if ($heuresRestantes < 0) {
                continue;
            }

            if ($heuresRestantes <= 48 && $heuresRestantes > 24 && ! $rdv->rappel_48h_envoye) {
                $this->envoyer($rdv, '48h');
                $rdv->update(['rappel_48h_envoye' => true]);
                $envoyes++;
            } elseif ($heuresRestantes <= 24 && $heuresRestantes > 2 && ! $rdv->rappel_24h_envoye) {
                $this->envoyer($rdv, '24h');
                $rdv->update(['rappel_24h_envoye' => true]);
                $envoyes++;
            } elseif ($heuresRestantes <= 2 && $heuresRestantes > 0 && ! $rdv->rappel_2h_envoye) {
                $this->envoyer($rdv, '2h');
                $rdv->update(['rappel_2h_envoye' => true]);
                $envoyes++;
            } elseif ($maintenant->isSameDay($dateHeureRdv) && ! $rdv->rappel_jourj_envoye) {
                $this->envoyer($rdv, 'jourj');
                $rdv->update(['rappel_jourj_envoye' => true]);
                $envoyes++;
            }
        }

        $this->info("{$envoyes} rappel(s) envoyé(s).");

        return self::SUCCESS;
    }

    private function envoyer(RendezVous $rdv, string $delai): void
    {
        $rdv->patient->notify(new RappelRendezVous($rdv, $delai));
        $this->line("→ Rappel {$delai} envoyé pour {$rdv->numero_rendez_vous} à {$rdv->patient->email}");
    }
}