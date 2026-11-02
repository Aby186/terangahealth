<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'expediteur_id',
        'destinataire_id',
        'contenu',
        'lu',
        'supprime_par_expediteur',
        'supprime_par_destinataire',
    ];
    

    protected function casts(): array
    {
        return [
            'lu' => 'boolean',
            'supprime_par_expediteur' => 'boolean',
            'supprime_par_destinataire' => 'boolean',
        ];
    }

    

    public function expediteur()
    {
        return $this->belongsTo(User::class, 'expediteur_id');
    }

    public function destinataire()
    {
        return $this->belongsTo(User::class, 'destinataire_id');
    }
}