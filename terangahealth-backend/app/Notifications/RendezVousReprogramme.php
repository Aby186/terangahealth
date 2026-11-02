<?php

namespace App\Notifications;

use App\Models\RendezVous;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Prévient le patient que son rendez-vous a été déplacé :
 * e-mail + SMS, avec les jours et heures exacts.
 */
class RendezVousReprogramme extends Notification
{
    use Queueable;

    public function __construct(
        public RendezVous $rendezVous,
        public string $ancienneDate,
        public string $ancienneHeure
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', \App\Channels\SmsToChannel::class];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $rdv = $this->rendezVous;

        return (new MailMessage)
            ->subject('Votre rendez-vous a été reprogrammé')
            ->greeting('Bonjour ' . $notifiable->prenom . ',')
            ->line("Votre rendez-vous du **{$this->jour($this->ancienneDate)} à {$this->heureMail($this->ancienneHeure)}** avec le Dr {$rdv->medecin->prenom} {$rdv->medecin->nom} a dû être déplacé. Nous nous en excusons.")
            ->line("Il est maintenant fixé au **{$this->jour($rdv->date_rendez_vous)} à {$this->heureMail($rdv->heure_rendez_vous)}**.")
            ->line('Si ce créneau ne vous convient pas, vous pouvez le modifier depuis « Mes rendez-vous » sur TerangaHealth, ou écrire à la secrétaire dans la messagerie.')
            ->line('Nous vous remercions de votre compréhension.')
            ->salutation('Cordialement, l\'équipe TerangaHealth — Clinique Elok Cardiologie');
    }

    public function toSmsTo(object $notifiable): string
    {
        $rdv = $this->rendezVous;
        $nouveau = $this->jour($rdv->date_rendez_vous) . ' a ' . substr($rdv->heure_rendez_vous, 0, 5);

        $lignes = [
            "Bonjour {$notifiable->prenom},",
            '',
            "Votre rendez-vous avec le Docteur {$rdv->medecin->nom} a ete deplace.",
            "Nouvelle date : {$nouveau}.",
            '',
            'Cette date ne vous convient pas ? Vous pouvez reprogrammer vous-meme dans "Mes rendez-vous".',
            '',
            'TerangaHealth',
        ];

        // Str::ascii supprime les retours à la ligne : on convertit ligne par ligne.
        return implode("\n", array_map(fn ($ligne) => Str::ascii($ligne), $lignes));
    }

    private function jour($date): string
    {
        try {
            return Carbon::parse((string) $date)->locale('fr')->isoFormat('dddd D MMMM');
        } catch (\Throwable $e) {
            return (string) $date;
        }
    }

    private function heureMail($heure): string
    {
        return str_replace(':', 'h', substr((string) $heure, 0, 5));
    }
}