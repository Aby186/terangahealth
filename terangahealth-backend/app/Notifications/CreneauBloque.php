<?php

namespace App\Notifications;

use App\Models\RendezVous;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Str;

/**
 * Prévient un patient que le médecin a bloqué le créneau (ou la journée)
 * de son rendez-vous. La secrétaire lui proposera un nouveau créneau.
 */
class CreneauBloque extends Notification
{
    use Queueable;

    public function __construct(public RendezVous $rendezVous) {}

    public function via(object $notifiable): array
    {
        return ['mail', \App\Channels\SmsToChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $rdv = $this->rendezVous;
        $dateFormatee = \Carbon\Carbon::parse($rdv->date_rendez_vous)->locale('fr')->isoFormat('dddd D MMMM YYYY');

        return (new MailMessage)
            ->subject('Votre rendez-vous doit être reprogrammé')
            ->greeting('Bonjour ' . $notifiable->prenom . ',')
            ->line("Le Dr {$rdv->medecin->prenom} {$rdv->medecin->nom} n'est plus disponible à l'heure de votre rendez-vous. Nous nous en excusons.")
            ->line("**Date prévue :** {$dateFormatee}")
            ->line('**Heure prévue :** ' . substr($rdv->heure_rendez_vous, 0, 5))
            ->line('La secrétaire vous proposera rapidement le créneau le plus proche possible.')
            ->line('Si ce nouveau créneau ne vous convient pas, vous pourrez le reprogrammer vous-même depuis « Mes rendez-vous » sur TerangaHealth.')
            ->salutation('L\'équipe TerangaHealth — Clinique Elok Cardiologie');
    }

    public function toSmsTo(object $notifiable): string
    {
        $rdv = $this->rendezVous;
        $heure = substr($rdv->heure_rendez_vous, 0, 5);
        $date = \Carbon\Carbon::parse($rdv->date_rendez_vous)->locale('fr')->isoFormat('dddd D MMMM');

        $lignes = [
            "Bonjour {$notifiable->prenom},",
            '',
            "Le Docteur {$rdv->medecin->nom} n'est plus disponible le {$date} a {$heure}.",
            '',
            'La secretaire vous proposera rapidement le creneau le plus proche.',
            '',
            'TerangaHealth',
        ];

        // Str::ascii supprime les retours a la ligne : on convertit ligne par ligne.
        return implode("\n", array_map(fn ($ligne) => Str::ascii($ligne), $lignes));
    }
}