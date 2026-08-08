<?php

namespace App\Notifications;

use App\Models\Creneau;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class CreneauLibere extends Notification
{
    use Queueable;

    public function __construct(
        public Creneau $creneau
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', \App\Channels\SmsToChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $planning = $this->creneau->planning;
        $medecin = $planning->medecin;
        $dateFormatee = \Carbon\Carbon::parse($planning->date_planning)->locale('fr')->isoFormat('dddd D MMMM YYYY');
        $heure = substr($this->creneau->heure_debut, 0, 5);

        return (new MailMessage)
            ->subject('Un créneau vient de se libérer !')
            ->greeting('Bonjour ' . $notifiable->prenom . ',')
            ->line('Bonne nouvelle : un créneau correspondant à votre demande vient de se libérer.')
            ->line("**Médecin :** Dr {$medecin->prenom} {$medecin->nom}")
            ->line("**Date :** {$dateFormatee}")
            ->line("**Heure :** {$heure}")
            ->line('Ce créneau est proposé au premier arrivé, premier servi — réservez rapidement pour ne pas le manquer.')
            ->action('Réserver ce créneau', config('app.frontend_url') . '/prendre-rdv/' . $medecin->id)
            ->salutation('L\'équipe TerangaHealth — Clinique Elok Cardiologie');
    }

    public function toSmsTo(object $notifiable): string
    {
        $planning = $this->creneau->planning;
        $medecin = $planning->medecin;
        $dateFormatee = \Carbon\Carbon::parse($planning->date_planning)->locale('fr')->isoFormat('D MMMM');
        $heure = substr($this->creneau->heure_debut, 0, 5);

        return "TerangaHealth: Un créneau s'est libéré avec Dr {$medecin->nom} le {$dateFormatee} à {$heure}. Réservez vite sur l'appli !";
    }
}