<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Planning extends Model
{
    use HasFactory;

    protected $fillable = [
        'medecin_id',
        'date_planning',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date_planning' => 'date',
        ];
    }

    public function medecin()
    {
        return $this->belongsTo(User::class, 'medecin_id');
    }

    public function creneaux()
    {
        return $this->hasMany(Creneau::class);
    }
}