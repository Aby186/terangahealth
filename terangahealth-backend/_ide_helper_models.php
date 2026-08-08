<?php

// @formatter:off
// phpcs:ignoreFile
/**
 * A helper file for your Eloquent Models
 * Copy the phpDocs from this file to the correct Model,
 * And remove them from this file, to prevent double declarations.
 *
 * @author Barry vd. Heuvel <barryvdh@gmail.com>
 */


namespace App\Models{
/**
 * @property int $id
 * @property int $planning_id
 * @property string $code_creneau
 * @property string $heure_debut
 * @property string $heure_fin
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Planning $planning
 * @property-read \App\Models\RendezVous|null $rendezVous
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Creneau disponibles()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Creneau newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Creneau newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Creneau query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Creneau whereCodeCreneau($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Creneau whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Creneau whereHeureDebut($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Creneau whereHeureFin($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Creneau whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Creneau wherePlanningId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Creneau whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Creneau whereUpdatedAt($value)
 */
	class Creneau extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property int $medecin_id
 * @property \Illuminate\Support\Carbon $date_planning
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Creneau> $creneaux
 * @property-read int|null $creneaux_count
 * @property-read \App\Models\User $medecin
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Planning newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Planning newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Planning query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Planning whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Planning whereDatePlanning($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Planning whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Planning whereMedecinId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Planning whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Planning whereUpdatedAt($value)
 */
	class Planning extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $numero_rendez_vous
 * @property int $patient_id
 * @property int $medecin_id
 * @property int $service_id
 * @property int $creneau_id
 * @property string $motif
 * @property \Illuminate\Support\Carbon $date_rendez_vous
 * @property string $heure_rendez_vous
 * @property string $status
 * @property bool $urgent
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property bool $rappel_48h_envoye
 * @property bool $rappel_24h_envoye
 * @property bool $rappel_jourj_envoye
 * @property bool $rappel_2h_envoye
 * @property-read \App\Models\Creneau $creneau
 * @property-read \App\Models\User $medecin
 * @property-read \App\Models\User $patient
 * @property-read \App\Models\Service $service
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous enAttente()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous urgents()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereCreneauId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereDateRendezVous($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereHeureRendezVous($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereMedecinId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereMotif($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereNumeroRendezVous($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous wherePatientId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereRappel24hEnvoye($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereRappel2hEnvoye($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereRappel48hEnvoye($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereRappelJourjEnvoye($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereServiceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|RendezVous whereUrgent($value)
 */
	class RendezVous extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $nom
 * @property string|null $description
 * @property int $duree_consultation
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\User> $medecins
 * @property-read int|null $medecins_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RendezVous> $rendezVous
 * @property-read int|null $rendez_vous_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereDureeConsultation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereNom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Service whereUpdatedAt($value)
 */
	class Service extends \Eloquent {}
}

namespace App\Models{
/**
 * @property int $id
 * @property string $nom
 * @property string $prenom
 * @property \Illuminate\Support\Carbon|null $date_naissance
 * @property string|null $sexe
 * @property string|null $telephone
 * @property string $email
 * @property string|null $photo
 * @property string $statut
 * @property string|null $matricule
 * @property string $password
 * @property string|null $adresse
 * @property string $role
 * @property int|null $experience
 * @property string|null $langues_parlees
 * @property string|null $code_patient
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 * @property string|null $remember_token
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $service_id
 * @property-read string $nom_complet
 * @property-read \Illuminate\Notifications\DatabaseNotificationCollection<int, \Illuminate\Notifications\DatabaseNotification> $notifications
 * @property-read int|null $notifications_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Planning> $plannings
 * @property-read int|null $plannings_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RendezVous> $rendezVousMedecin
 * @property-read int|null $rendez_vous_medecin_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\RendezVous> $rendezVousPatient
 * @property-read int|null $rendez_vous_patient_count
 * @property-read \App\Models\Service|null $service
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \Laravel\Sanctum\PersonalAccessToken> $tokens
 * @property-read int|null $tokens_count
 * @method static \Database\Factories\UserFactory factory($count = null, $state = [])
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User medecins()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User patients()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereAdresse($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCodePatient($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereDateNaissance($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmail($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereEmailVerifiedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereExperience($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereLanguesParlees($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereMatricule($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereNom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePassword($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePhoto($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User wherePrenom($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRememberToken($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereRole($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereServiceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereSexe($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereStatut($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereTelephone($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|User whereUpdatedAt($value)
 */
	class User extends \Eloquent {}
}

