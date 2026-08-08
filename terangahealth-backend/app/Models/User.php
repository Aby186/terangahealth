<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'nom',
        'prenom',
        'date_naissance',
        'sexe',
        'telephone',
        'email',
        'photo',
        'statut',
        'matricule',
        'password',
        'adresse',
        'role',
        'service_id',
        'experience',
        'langues_parlees',
        'code_patient',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'date_naissance' => 'date',
            'password' => 'hashed',
            'last_login_at' => 'datetime',
        ];
    }

    public function getNomCompletAttribute(): string
    {
        return "{$this->prenom} {$this->nom}";
    }

    public function scopeMedecins($query)
    {
        return $query->where('role', 'medecin');
    }

    public function scopePatients($query)
    {
        return $query->where('role', 'patient');
    }

    public function isMedecin(): bool
    {
        return $this->role === 'medecin';
    }

    public function isPatient(): bool
    {
        return $this->role === 'patient';
    }

    public function isSecretaire(): bool
    {
        return $this->role === 'secretaire';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'administrateur';
    }

    // un médecin appartient à un seul service
    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function plannings()
    {
        return $this->hasMany(Planning::class, 'medecin_id');
    }

    public function rendezVousPatient()
    {
        return $this->hasMany(RendezVous::class, 'patient_id');
    }

    public function rendezVousMedecin()
    {
        return $this->hasMany(RendezVous::class, 'medecin_id');
    }

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            if ($user->role === 'patient' && empty($user->code_patient)) {
                $user->code_patient = 'PAT-' . str_pad((string) (static::patients()->count() + 1), 4, '0', STR_PAD_LEFT);
            }

            if (in_array($user->role, ['medecin', 'secretaire', 'administrateur']) && empty($user->matricule)) {
                $prefix = match ($user->role) {
                    'medecin' => 'DOC',
                    'secretaire' => 'SEC',
                    'administrateur' => 'ADM',
                };
                $user->matricule = $prefix . str_pad((string) (static::where('role', $user->role)->count() + 1), 3, '0', STR_PAD_LEFT);
            }
        });
    }
}