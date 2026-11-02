<?php

namespace App\Notifications;

use App\Models\RendezVous;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Str;

class RappelRendezVous extends Notification
{
    use Queueable;

    public function __construct(
        public RendezVous $rendezVous,
        public string $delai // '48h' | '24h' | 'jourj' | '2h'
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', \App\Channels\SmsToChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $rdv = $this->rendezVous;
        $dateFormatee = \Carbon\Carbon::parse($rdv->date_rendez_vous)->locale('fr')->isoFormat('dddd D MMMM YYYY');
        $heure = substr($rdv->heure_rendez_vous, 0, 5);

        return (new MailMessage)
            ->subject("Rappel : votre rendez-vous du {$dateFormatee} a {$heure}")
            ->greeting('Bonjour ' . $notifiable->prenom . ',')
            ->line('Nous vous rappelons votre prochain rendez-vous a la clinique.')
            ->line("**Médecin :** Dr {$rdv->medecin->prenom} {$rdv->medecin->nom}")
            ->line("**Date :** {$dateFormatee}")
            ->line("**Heure :** {$heure}")
            ->line("**Motif :** {$rdv->motif}")
            ->line('Nous vous remercions de vous présenter quelques minutes avant l\'heure prévue, afin que votre accueil se passe dans les meilleures conditions.')
            ->line('Toute l\'équipe de la Clinique Elok Cardiologie vous souhaite une excellente consultation.')
            ->salutation('Cordialement, l\'équipe TerangaHealth — Clinique Elok Cardiologie');
    }

    public function toSmsTo(object $notifiable): string
    {
        $rdv = $this->rendezVous;
        $heure = substr($rdv->heure_rendez_vous, 0, 5);
        $date = \Carbon\Carbon::parse($rdv->date_rendez_vous)->locale('fr')->isoFormat('dddd D MMMM');

        $lignes = [
            "Bonjour {$notifiable->prenom},",
            '',
            "Rappel de votre rendez-vous avec le Docteur {$rdv->medecin->nom} {$date} a {$heure}.",
            '',
            'A bientot et bonne consultation.',
            'TerangaHealth',
        ];

        // Str::ascii supprime les retours a la ligne : on convertit ligne par ligne.
        return implode("\n", array_map(fn ($ligne) => Str::ascii($ligne), $lignes));
    }
}