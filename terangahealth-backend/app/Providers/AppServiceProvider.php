<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // E-mail de réinitialisation en français. Laravel fournit ici le jeton ($token) :
        // on construit nous-mêmes le lien qui ouvre la page Angular « Nouveau mot de passe ».
        ResetPassword::toMailUsing(function ($notifiable, string $token) {
            $frontend = rtrim(env('FRONTEND_URL', 'http://localhost:4200'), '/');

            $url = $frontend . '/nouveau-mot-de-passe?token=' . $token
                . '&email=' . urlencode($notifiable->getEmailForPasswordReset());

            $expiration = config('auth.passwords.' . config('auth.defaults.passwords') . '.expire');

            return (new MailMessage)
                ->subject('Réinitialisation de votre mot de passe - TerangaHealth')
                ->greeting('Bonjour ' . $notifiable->prenom . ',')
                ->line('Vous avez demandé à réinitialiser le mot de passe de votre compte TerangaHealth.')
                ->action('Choisir un nouveau mot de passe', $url)
                ->line("Ce lien est valable {$expiration} minutes et ne peut être utilisé qu'une seule fois.")
                ->line("Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.")
                ->salutation("L'équipe TerangaHealth");
        });
    }
}