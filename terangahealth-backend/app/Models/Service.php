<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'description',
        'duree_consultation',
        'tarif',
    ];

    public function medecins()
    {
        return $this->hasMany(User::class)->where('role', 'medecin');
    }

    public function rendezVous()
    {
        return $this->hasMany(RendezVous::class);
    }
}