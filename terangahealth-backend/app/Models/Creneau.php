<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Creneau extends Model
{
    use HasFactory;

    protected $table = 'creneaux';

    protected $fillable = [
        'planning_id',
        'code_creneau',
        'heure_debut',
        'heure_fin',
        'status',
    ];

    public function planning()
    {
        return $this->belongsTo(Planning::class);
    }

    public function rendezVous()
    {
        return $this->hasOne(RendezVous::class);
    }

    public function scopeDisponibles($query)
    {
        return $query->where('status', 'disponible');
    }
    

    protected static function booted(): void
    {
        static::creating(function (Creneau $creneau) {
            if (empty($creneau->code_creneau)) {
                $creneau->code_creneau = 'CR-' . strtoupper(uniqid());
            }
        });
    }
}