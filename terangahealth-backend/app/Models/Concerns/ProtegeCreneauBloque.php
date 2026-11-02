<?php

namespace App\Models\Concerns;

use App\Models\RendezVous;
use Illuminate\Http\Exceptions\HttpResponseException;

trait ProtegeCreneauBloque
{
    public static function bootProtegeCreneauBloque(): void
    {
        // Un créneau bloqué par le médecin ne redevient pas réservable quand on libère un rendez-vous.
        static::updating(function ($creneau) {
            if ($creneau->getOriginal('status') === 'indisponible' && $creneau->status !== 'indisponible') {
                $creneau->status = 'indisponible';
            }
        });

        // Un créneau qui contient un rendez-vous actif ne peut pas être supprimé.
        static::deleting(function ($creneau) {
            $actif = RendezVous::where('creneau_id', $creneau->id)
                ->whereIn('status', ['en_attente', 'confirme'])
                ->exists();

            if ($actif) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Impossible de supprimer ce créneau : un rendez-vous y est rattaché.',
                ], 409));
            }
        });
    }
}