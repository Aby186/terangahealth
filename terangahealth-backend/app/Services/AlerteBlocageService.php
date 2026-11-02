<?php

namespace App\Services;

use App\Models\Message;
use App\Models\RendezVous;
use App\Models\User;
use App\Notifications\CreneauBloque;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Quand le médecin bloque un créneau (ou une journée) qui porte un rendez-vous :
 *  - le patient reçoit un message interne, un e-mail et un SMS ;
 *  - les secrétaires reçoivent un message interne (le rendez-vous apparaît
 *    aussi dans « À reprogrammer »).
 * Une panne d'envoi ne bloque jamais l'action du médecin.
 */
class AlerteBlocageService
{
    public function prevenir(RendezVous $rdv): void
    {
        $rdv->loadMissing('patient', 'medecin');

        $medecin = $rdv->medecin;
        $patient = $rdv->patient;

        if (! $medecin || ! $patient) {
            return;
        }

        $date = Carbon::parse($rdv->date_rendez_vous)->locale('fr')->isoFormat('dddd D MMMM');
        $heure = substr($rdv->heure_rendez_vous, 0, 5);

        // 1) Patient : message interne
        $this->message(
            $medecin->id,
            $patient->id,
            "Bonjour, je ne suis plus disponible le {$date} à {$heure}. "
            . 'La secrétaire va vous proposer très rapidement un nouveau créneau.'
        );

        // 2) Patient : e-mail + SMS
        try {
            $patient->notify(new CreneauBloque($rdv));
        } catch (\Throwable $e) {
            Log::warning("Alerte blocage : notification patient {$patient->id} impossible : " . $e->getMessage());
        }

        // 3) Secrétaires : message interne
        $secretaires = User::where('role', 'secretaire')->get();

        foreach ($secretaires as $secretaire) {
            $this->message(
                $medecin->id,
                $secretaire->id,
                "Créneau bloqué : le rendez-vous de {$patient->prenom} {$patient->nom} du {$date} à {$heure} "
                . 'est à reprogrammer au plus vite (voir « À reprogrammer »).'
            );
        }

        Log::info("Alerte blocage : rendez-vous {$rdv->id} signalé au patient et à la secrétaire.");
    }

    private function message(int $expediteurId, int $destinataireId, string $contenu): void
    {
        try {
            Message::create([
                'expediteur_id'   => $expediteurId,
                'destinataire_id' => $destinataireId,
                'contenu'         => $contenu,
                'lu'              => false,
            ]);
        } catch (\Throwable $e) {
            Log::warning("Alerte blocage : message interne impossible : " . $e->getMessage());
        }
    }
}