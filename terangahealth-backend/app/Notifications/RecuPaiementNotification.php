<?php

namespace App\Notifications;

use App\Channels\SmsToChannel;
use App\Models\RendezVous;
use Carbon\Carbon;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RecuPaiementNotification extends Notification
{
    public function __construct(
        private RendezVous $rendezVous,
        private float $montant,
        private ?string $urlRecu = null,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail', SmsToChannel::class];
    }

    private function montantFormate(): string
    {
        return number_format($this->montant, 0, ',', ' ') . ' FCFA';
    }

    public function toMail(object $notifiable): MailMessage
    {
        $nom = trim(($notifiable->prenom ?? '') . ' ' . ($notifiable->nom ?? ''));
        $date = Carbon::parse($this->rendezVous->date_rendez_vous)->locale('fr')->translatedFormat('l j F Y');
        $heure = substr((string) $this->rendezVous->heure_rendez_vous, 0, 5);
        $service = $this->rendezVous->service->nom ?? 'Consultation';

        $mail = (new MailMessage)
            ->subject("Re\u{e7}u de paiement - TerangaHealth")
            ->greeting($nom !== '' ? "Bonjour $nom," : 'Bonjour,')
            ->line("Nous avons bien re\u{e7}u votre paiement. Voici votre facture.")
            ->line("Service : $service")
            ->line("Rendez-vous : $date \u{e0} $heure")
            ->line("Montant pay\u{e9} : " . $this->montantFormate());

        if ($this->urlRecu) {
            $mail->action("Voir mon re\u{e7}u", $this->urlRecu);
        }

        return $mail->line('Merci de votre confiance. Clinique Elok Cardiologie - TerangaHealth');
    }

    public function toSmsTo(object $notifiable): string
    {
        $date = Carbon::parse($this->rendezVous->date_rendez_vous)->format('d/m/Y');
        $heure = substr((string) $this->rendezVous->heure_rendez_vous, 0, 5);
        $service = $this->rendezVous->service->nom ?? 'Consultation';

        $texte = "TerangaHealth : paiement de {$this->montantFormate()} recu pour $service. RDV le $date a $heure.";

        if ($this->urlRecu) {
            $texte .= ' Recu : ' . $this->urlRecu;
        }

        return $texte;
    }
}