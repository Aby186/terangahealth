<?php

namespace App\Notifications;

use App\Models\RendezVous;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

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

        $lienAnnulation = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'rendezvous.annuler.lien',
            now()->addDays(3),
            ['rendezVous' => $rdv->id]
        );

        return (new MailMessage)
            ->subject($this->sujet())
            ->greeting('Bonjour ' . $notifiable->prenom . ',')
            ->line($this->introduction())
            ->line("**Médecin :** Dr {$rdv->medecin->prenom} {$rdv->medecin->nom}")
            ->line("**Date :** {$dateFormatee}")
            ->line("**Heure :** " . substr($rdv->heure_rendez_vous, 0, 5))
            ->line("**Motif :** {$rdv->motif}")
            ->line('Merci de vous présenter quelques minutes avant l\'heure prévue.')
            ->action('Annuler ce rendez-vous', $lienAnnulation)
            ->line('Si vous ne pouvez plus vous rendre à ce rendez-vous, merci de l\'annuler dès que possible pour libérer le créneau à un autre patient.')
            ->salutation('L\'équipe TerangaHealth — Clinique Elok Cardiologie');
    }

    public function toSmsTo(object $notifiable): string
    {
        $rdv = $this->rendezVous;
        $heure = substr($rdv->heure_rendez_vous, 0, 5);
        $dateFormatee = \Carbon\Carbon::parse($rdv->date_rendez_vous)->locale('fr')->isoFormat('D MMMM');

        $lienAnnulation = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'rendezvous.annuler.lien',
            now()->addDays(3),
            ['rendezVous' => $rdv->id]
        );

        $intro = match ($this->delai) {
            '48h'   => "RDV avec Dr {$rdv->medecin->nom} le {$dateFormatee} à {$heure} (dans 48h).",
            '24h'   => "Rappel - RDV demain avec Dr {$rdv->medecin->nom} à {$heure}.",
            'jourj' => "Votre RDV avec Dr {$rdv->medecin->nom} est aujourd'hui à {$heure}.",
            '2h'    => "Votre RDV avec Dr {$rdv->medecin->nom} est dans 2h ({$heure}).",
        };

        return "TerangaHealth: {$intro} Annuler: {$lienAnnulation}";
    }

    private function sujet(): string
    {
        return match ($this->delai) {
            '48h'   => 'Rappel : rendez-vous dans 48 heures',
            '24h'   => 'Rappel : rendez-vous demain',
            'jourj' => 'Rappel : votre rendez-vous est aujourd\'hui',
            '2h'    => 'Rappel : votre rendez-vous dans 2 heures',
        };
    }

    private function introduction(): string
    {
        return match ($this->delai) {
            '48h'   => 'Nous vous rappelons que vous avez un rendez-vous dans 48 heures.',
            '24h'   => 'Nous vous rappelons que vous avez un rendez-vous demain.',
            'jourj' => 'Nous vous rappelons que vous avez un rendez-vous aujourd\'hui.',
            '2h'    => 'Votre rendez-vous approche, il est prévu dans 2 heures.',
        };
    }
}