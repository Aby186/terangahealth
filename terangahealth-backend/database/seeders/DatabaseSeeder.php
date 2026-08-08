<?php

namespace Database\Seeders;

use App\Models\Creneau;
use App\Models\Planning;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ---------- Services ----------
        $cardio = Service::updateOrCreate(
            ['nom' => 'Cardiologie'],
            ['description' => 'La cardiologie est la spécialité médicale qui étudie, diagnostique et traite les maladies du cœur et du système cardiovasculaire : hypertension artérielle, insuffisance cardiaque, troubles du rythme, maladies coronariennes et autres pathologies vasculaires.', 'duree_consultation' => 30]
        );

        $dermato = Service::updateOrCreate(
            ['nom' => 'Dermatologie'],
            ['description' => 'La dermatologie est la spécialité médicale consacrée au diagnostic et au traitement des maladies de la peau, des cheveux, des ongles et des muqueuses.', 'duree_consultation' => 20]
        );

        $pediatrie = Service::updateOrCreate(
            ['nom' => 'Pédiatrie'],
            ['description' => 'La pédiatrie est la spécialité médicale consacrée au suivi de la santé, à la prévention et au traitement des maladies de l\'enfant, du nouveau-né à l\'adolescent.', 'duree_consultation' => 25]
        );

        $diabetologie = Service::updateOrCreate(
            ['nom' => 'Diabétologie'],
            ['description' => 'La diabétologie est la spécialité médicale dédiée au dépistage, à la prise en charge et au suivi du diabète et des troubles du métabolisme du glucose.', 'duree_consultation' => 30]
        );

        $orl = Service::updateOrCreate(
            ['nom' => 'ORL'],
            ['description' => 'L\'ORL (oto-rhino-laryngologie) est la spécialité médicale qui traite les affections de l\'oreille, du nez et de la gorge, ainsi que des voies aériennes supérieures.', 'duree_consultation' => 20]
        );

        $gastro = Service::updateOrCreate(
            ['nom' => 'Gastro-entérologie'],
            ['description' => 'La gastro-entérologie est la spécialité médicale consacrée au diagnostic et au traitement des maladies de l\'appareil digestif : estomac, intestins, foie, pancréas et voies biliaires.', 'duree_consultation' => 30]
        );

        $medecineGenerale = Service::updateOrCreate(
            ['nom' => 'Médecine générale'],
            ['description' => 'La médecine générale assure le suivi médical global du patient, la prévention, le dépistage et l\'orientation vers les spécialistes si nécessaire.', 'duree_consultation' => 20]
        );

        // ---------- Patiente de test ----------
        $fatou = User::updateOrCreate(
            ['email' => 'fatou@test.com'],
            [
                'nom' => 'Diallo',
                'prenom' => 'Fatou',
                'password' => Hash::make('123456'),
                'role' => 'patient',
                'statut' => 'actif',
                'telephone' => '+221771234567',
            ]
        );

        // ---------- Médecin principal ----------
        $medecin = User::updateOrCreate(
            ['email' => 'bara.diop@test.com'],
            [
                'nom' => 'Diop',
                'prenom' => 'Bara',
                'password' => Hash::make('123456'),
                'role' => 'medecin',
                'statut' => 'actif',
                'service_id' => $cardio->id,
                'experience' => 12,
                'langues_parlees' => 'Français, Wolof',
                'telephone' => '+221771111111',
            ]
        );

        // ---------- Secrétaire ----------
        User::updateOrCreate(
            ['email' => 'secretaire@test.com'],
            [
                'nom' => 'Ndiaye',
                'prenom' => 'Awa',
                'password' => Hash::make('123456'),
                'role' => 'secretaire',
                'statut' => 'actif',
            ]
        );

        // ---------- Administrateur ----------
        User::updateOrCreate(
            ['email' => 'admin@test.com'],
            [
                'nom' => 'Ba',
                'prenom' => 'Aby',
                'password' => Hash::make('123456'),
                'role' => 'administrateur',
                'statut' => 'actif',
            ]
        );

        // ---------- Planning + créneaux pour le médecin principal, demain ----------
        $planning = Planning::updateOrCreate(
            ['medecin_id' => $medecin->id, 'date_planning' => now()->addDay()->toDateString()],
            ['status' => 'actif']
        );

        $heures = ['09:00', '09:30', '10:00', '10:30', '11:00'];

        foreach ($heures as $heure) {
            Creneau::updateOrCreate(
                [
                    'planning_id' => $planning->id,
                    'heure_debut' => $heure,
                ],
                [
                    'heure_fin' => date('H:i', strtotime($heure) + 1800),
                    'status' => 'disponible',
                ]
            );
        }

        // ---------- Nouveaux médecins ----------
        $nouveauxMedecins = [
            [
                'email' => 'aminata.fall@test.com',
                'nom' => 'Fall',
                'prenom' => 'Aminata',
                'service_id' => $dermato->id,
                'experience' => 8,
                'langues_parlees' => 'Français, Anglais',
                'telephone' => '+221771111102',
            ],
            [
                'email' => 'moussa.ndiaye@test.com',
                'nom' => 'Ndiaye',
                'prenom' => 'Moussa',
                'service_id' => $pediatrie->id,
                'experience' => 15,
                'langues_parlees' => 'Français, Wolof, Pulaar',
                'telephone' => '+221771111103',
            ],
            [
                'email' => 'fatoumata.sarr@test.com',
                'nom' => 'Sarr',
                'prenom' => 'Fatoumata',
                'service_id' => $diabetologie->id,
                'experience' => 10,
                'langues_parlees' => 'Français, Wolof',
                'telephone' => '+221771111104',
            ],
            [
                'email' => 'ibrahima.diallo@test.com',
                'nom' => 'Diallo',
                'prenom' => 'Ibrahima',
                'service_id' => $orl->id,
                'experience' => 6,
                'langues_parlees' => 'Français, Wolof, Anglais',
                'telephone' => '+221771111105',
            ],
            [
                'email' => 'khady.ba@test.com',
                'nom' => 'Ba',
                'prenom' => 'Khady',
                'service_id' => $gastro->id,
                'experience' => 12,
                'langues_parlees' => 'Français, Wolof',
                'telephone' => '+221771111106',
            ],
            [
                'email' => 'cheikh.gueye@test.com',
                'nom' => 'Gueye',
                'prenom' => 'Cheikh',
                'service_id' => $medecineGenerale->id,
                'experience' => 20,
                'langues_parlees' => 'Français, Wolof, Sérère',
                'telephone' => '+221771111107',
            ],
            [
                'email' => 'mariama.sow@test.com',
                'nom' => 'Sow',
                'prenom' => 'Mariama',
                'service_id' => $cardio->id,
                'experience' => 9,
                'langues_parlees' => 'Français, Anglais, Wolof',
                'telephone' => '+221771111108',
            ],
        ];

        foreach ($nouveauxMedecins as $data) {
            $nouveauMedecin = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'nom' => $data['nom'],
                    'prenom' => $data['prenom'],
                    'password' => Hash::make('123456'),
                    'role' => 'medecin',
                    'statut' => 'actif',
                    'telephone' => $data['telephone'],
                    'service_id' => $data['service_id'],
                    'experience' => $data['experience'],
                    'langues_parlees' => $data['langues_parlees'],
                ]
            );

            $planningNouveau = Planning::updateOrCreate(
                [
                    'medecin_id' => $nouveauMedecin->id,
                    'date_planning' => now()->addDay()->toDateString(),
                ],
                ['status' => 'actif']
            );

            if ($planningNouveau->creneaux()->count() === 0) {
                $heureDebut = now()->addDay()->setTime(9, 0);
                for ($i = 0; $i < 5; $i++) {
                    Creneau::create([
                        'planning_id' => $planningNouveau->id,
                        'heure_debut' => $heureDebut->format('H:i'),
                        'heure_fin'   => $heureDebut->copy()->addMinutes(30)->format('H:i'),
                        'status'      => 'disponible',
                    ]);
                    $heureDebut->addMinutes(30);
                }
            }
        }

        $this->command->info('Jeu de données de test créé : 8 médecins, 1 secrétaire, 1 admin, 7 services.');
    }
}