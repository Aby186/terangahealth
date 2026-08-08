<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RendezVous extends Model
{
    use HasFactory;

    protected $table = 'rendez_vous';

    protected $fillable = [
        'numero_rendez_vous',
        'patient_id',
        'medecin_id',
        'service_id',
        'creneau_id',
        'motif',
        'date_rendez_vous',
        'heure_rendez_vous',
        'status',
        'urgent',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date_rendez_vous' => 'date',
            'urgent' => 'boolean',
        ];
    }

    // ---------- Relations ----------
    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function medecin()
    {
        return $this->belongsTo(User::class, 'medecin_id');
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function creneau()
    {
        return $this->belongsTo(Creneau::class);
    }

    // ---------- Scopes ----------
    public function scopeEnAttente($query)
    {
        return $query->where('status', 'en_attente');
    }

    public function scopeUrgents($query)
    {
        return $query->where('urgent', true);
    }

    /**
     * Analyse le motif de consultation pour détecter les cas urgents,
     * en fonction des mots-clés propres à la spécialité (config/urgence.php).
     */
    public static function detecterUrgence(string $motif, ?string $nomService = null): bool
    {
        $motsCles = config("urgence.mots_cles.{$nomService}")
            ?? config('urgence.mots_cles_defaut');

        $motifNormalise = mb_strtolower($motif);

        foreach ($motsCles as $mot) {
            if (str_contains($motifNormalise, $mot)) {
                return true;
            }
        }

        return false;
    }

    protected static function booted(): void
    {
        static::creating(function (RendezVous $rdv) {
            if (empty($rdv->numero_rendez_vous)) {
                $rdv->numero_rendez_vous = 'RDV-' . str_pad((string) (static::count() + 1), 4, '0', STR_PAD_LEFT);
            }
        });
    }
}