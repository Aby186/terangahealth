<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\RendezVous;
use App\Notifications\RendezVousReprogramme;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class NotificationReprogrammationController extends Controller
{
    /**
     * Prévient le patient après la reprogrammation de son rendez-vous :
     * message interne, e-mail et SMS (via la notification RendezVousReprogramme).
     * Appelé par la page de la secrétaire.
     * POST /api/rendez-vous/{rendezVous}/notifier-reprogrammation
     */
    public function notifier(Request $request, RendezVous $rendezVous)
    {
        $user = $request->user();

        if (! $user->isSecretaire() && ! $user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'ancienne_date'  => 'required|string|max:40',
            'ancienne_heure' => 'required|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Données invalides.', 'errors' => $validator->errors()], 422);
        }

        $rendezVous->load(['patient', 'medecin']);
        $patient = $rendezVous->patient;

        if (! $patient) {
            return response()->json(['message' => 'Patient introuvable.'], 404);
        }

        // 1) Message interne
        try {
            Message::create([
                'expediteur_id'   => $user->id,
                'destinataire_id' => $patient->id,
                'contenu'         => 'Bonjour, votre rendez-vous a été reprogrammé au '
                    . $this->formater($rendezVous->date_rendez_vous, $rendezVous->heure_rendez_vous)
                    . '. Si ce créneau ne vous convient pas, vous pouvez le modifier depuis « Mes rendez-vous ».',
                'lu'              => false,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Reprogrammation : message interne impossible : ' . $e->getMessage());
        }

        // 2) E-mail + SMS
        $notifie = false;

        try {
            $patient->notify(new RendezVousReprogramme(
                $rendezVous,
                $request->ancienne_date,
                $request->ancienne_heure
            ));
            $notifie = true;
        } catch (\Throwable $e) {
            Log::warning('Reprogrammation : notification impossible : ' . $e->getMessage());
        }

        return response()->json([
            'email_envoye'    => $notifie && (bool) $patient->email,
            'patient_a_email' => (bool) $patient->email,
            'sms'             => ($notifie && $patient->telephone) ? 'envoye' : 'non_envoye',
        ]);
    }

    private function formater($date, $heure): string
    {
        try {
            $jour = Carbon::parse((string) $date)->locale('fr')->isoFormat('dddd D MMMM');
        } catch (\Throwable $e) {
            $jour = (string) $date;
        }

        $h = str_replace(':', 'h', substr((string) $heure, 0, 5));

        return "{$jour} à {$h}";
    }
}
