<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SoftpayService
{
    /**
     * SoftPay Orange Money (Max it) : le patient n'a aucun formulaire a remplir, ses
     * informations viennent de son compte. Retourne l'adresse de paiement (QR code sur
     * ordinateur, application Max it sur telephone), ou null si SoftPay echoue : le
     * paiement continue alors avec la page PayDunya classique.
     */
    public function urlOrangeMoney(User $patient, string $token, ?string $telephone = null): ?string
    {
        try {
            $nom = trim(($patient->prenom ?? '') . ' ' . ($patient->nom ?? ''));
            $numero = substr(preg_replace('/\D+/', '', (string) ($telephone ?: $patient->telephone)), -9);

            if ($token === '' || strlen($numero) !== 9 || empty($patient->email)) {
                return null;
            }

            $reponse = Http::withHeaders([
                'PAYDUNYA-MASTER-KEY'  => config('services.paydunya.master_key'),
                'PAYDUNYA-PRIVATE-KEY' => config('services.paydunya.private_key'),
                'PAYDUNYA-TOKEN'       => config('services.paydunya.token'),
            ])->acceptJson()->timeout(20)->post('https://app.paydunya.com/api/v1/softpay/new-orange-money-senegal', [
                'customer_name'  => $nom !== '' ? $nom : 'Patient',
                'customer_email' => $patient->email,
                'phone_number'   => $numero,
                'invoice_token'  => $token,
            ]);

            if (! $reponse->successful() || ! $reponse->json('success')) {
                Log::warning('SoftPay Orange Money : echec (' . $reponse->status() . ') : ' . $reponse->body());
                return null;
            }

            $mobile = (bool) preg_match('/Android|iPhone|iPad|Mobile/i', (string) request()->userAgent());
            $urlMobile = $reponse->json('other_url.maxit_url');

            return ($mobile && $urlMobile) ? $urlMobile : ($reponse->json('url') ?: null);
        } catch (\Throwable $e) {
            Log::warning('SoftPay Orange Money : ' . $e->getMessage());
            return null;
        }
    }
}