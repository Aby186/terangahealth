<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ListeAttente extends Model
{
    use HasFactory;

    protected $table = 'liste_attente';

    protected $fillable = [
        'patient_id',
        'service_id',
        'medecin_id',
        'date_souhaitee',
        'statut',
    ];

    protected function casts(): array
    {
        return [
            'date_souhaitee' => 'date',
        ];
    }

    // ---------- Relations ----------
    public function patient()
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function medecin()
    {
        return $this->belongsTo(User::class, 'medecin_id');
    }

    // ---------- Scopes ----------
    public function scopeEnAttente($query)
    {
        return $query->where('statut', 'en_attente');
    }
}