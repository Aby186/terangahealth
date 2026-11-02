<?php

namespace App\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envoi de SMS via l'API SMS Sénégal d'Orange.
 * SMS_DRIVER=orange : envoi réel ; SMS_DRIVER=log : simulation (le SMS est écrit dans le log).
 */
class SmsToChannel
{
    private const CLE_JETON = 'orange_sms_jeton';

    public function send($notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toSmsTo')) {
            return;
        }

        $message = $notification->toSmsTo($notifiable);
        $numero = $this->normaliserNumero((string) $notifiable->telephone);

        if (! $numero) {
            Log::warning("SMS ignoré : téléphone absent ou invalide pour l'utilisateur {$notifiable->id}.");
            return;
        }

        if (config('services.orange_sms.driver') !== 'orange') {
            Log::info("SMS simulé vers {$numero} : {$message}");
            return;
        }

        try {
            $this->envoyer($numero, $message);
        } catch (\Throwable $e) {
            Log::warning('Exception lors de l\'envoi SMS Orange : ' . $e->getMessage());
        }
    }

    private function envoyer(string $numero, string $message, bool $nouvelEssai = true): void
    {
        $jeton = $this->jeton();

        if (! $jeton) {
            Log::warning('SMS Orange : jeton d\'accès introuvable, SMS non envoyé.');
            return;
        }

        $expediteur = (string) config('services.orange_sms.sender_address', 'tel:+2210000');
        $url = 'https://api.orange.com/smsmessaging/v1/outbound/' . rawurlencode($expediteur) . '/requests';

        $reponse = Http::withToken($jeton)->acceptJson()->post($url, [
            'outboundSMSMessageRequest' => [
                'address'                => 'tel:' . $numero,
                'senderAddress'          => $expediteur,
                'senderName'             => (string) config('services.orange_sms.sender_name', 'TerangaRDV'),
                'outboundSMSTextMessage' => ['message' => $message],
            ],
        ]);

        // Jeton expiré (valable 1 h) : on en demande un nouveau et on réessaie une fois.
        if ($reponse->status() === 401 && $nouvelEssai) {
            Cache::forget(self::CLE_JETON);
            $this->envoyer($numero, $message, false);
            return;
        }

        if ($reponse->status() !== 201) {
            Log::warning('Échec envoi SMS Orange (' . $reponse->status() . ') : ' . $reponse->body());
            return;
        }

        Log::info("SMS envoyé via Orange vers {$numero}.");
    }

    private function jeton(): ?string
    {
        $jeton = Cache::get(self::CLE_JETON);

        if ($jeton) {
            return $jeton;
        }

        $reponse = Http::asForm()
            ->withBasicAuth(
                (string) config('services.orange_sms.client_id'),
                (string) config('services.orange_sms.client_secret')
            )
            ->post('https://api.orange.com/oauth/v3/token', ['grant_type' => 'client_credentials']);

        if (! $reponse->successful()) {
            Log::warning('Orange : récupération du jeton échouée (' . $reponse->status() . ') : ' . $reponse->body());
            return null;
        }

        $jeton = $reponse->json('access_token');
        $duree = (int) $reponse->json('expires_in', 3600);

        if ($jeton) {
            Cache::put(self::CLE_JETON, $jeton, max(60, $duree - 120));
        }

        return $jeton;
    }

    /**
     * Met le numéro au format international sénégalais : +221XXXXXXXXX.
     */
    private function normaliserNumero(string $telephone): ?string
    {
        $chiffres = preg_replace('/\D+/', '', $telephone);

        if (strlen($chiffres) === 9) {
            $chiffres = '221' . $chiffres;
        }

        if (strlen($chiffres) === 14 && str_starts_with($chiffres, '00221')) {
            $chiffres = substr($chiffres, 2);
        }

        if (strlen($chiffres) !== 12 || ! str_starts_with($chiffres, '221')) {
            return null;
        }

        return '+' . $chiffres;
    }
}