<?php

namespace App\Channels;

use Illuminate\Notifications\Notification;
use Twilio\Rest\Client;
use Illuminate\Support\Facades\Log;

class SmsToChannel
{
    public function send($notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toSmsTo')) {
            return;
        }

        $message = $notification->toSmsTo($notifiable);
        $telephone = $notifiable->telephone;

        if (! $telephone) {
            return;
        }

        try {
            $client = new Client(config('services.twilio.sid'), config('services.twilio.auth_token'));

            $client->messages->create($telephone, [
                'from' => config('services.twilio.from'),
                'body' => $message,
            ]);
        } catch (\Exception $e) {
            Log::warning('Échec envoi SMS via Twilio : ' . $e->getMessage());
        }
    }
}