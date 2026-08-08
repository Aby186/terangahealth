import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/vitrine/vitrine.component').then(m => m.VitrineComponent),
  },
  {
    path: 'connexion',
    loadComponent: () => import('./features/auth/auth.component').then(m => m.AuthComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layouts/patient-layout/patient-layout.component').then(m => m.PatientLayoutComponent),
    children: [
      {
        path: 'bienvenue',
        loadComponent: () => import('./features/accueil-bienvenue/accueil-bienvenue.component').then(m => m.PatientAccueilBienvenueComponent),
      },
      {
        path: 'medecins',
        canActivate: [authGuard, roleGuard(['patient'])],
        loadComponent: () => import('./features/medecins/medecins.component').then(m => m.MedecinsComponent),
      },
      {
        path: 'prendre-rdv',
        canActivate: [authGuard, roleGuard(['patient'])],
        loadComponent: () => import('./features/prendre-rdv/prendre-rdv.component').then(m => m.PrendreRdvComponent),
      },
      {
        path: 'prendre-rdv/:medecinId',
        canActivate: [authGuard, roleGuard(['patient'])],
        loadComponent: () => import('./features/prendre-rdv/prendre-rdv.component').then(m => m.PrendreRdvComponent),
      },
      {
        path: 'mes-rendez-vous',
        canActivate: [authGuard, roleGuard(['patient'])],
        loadComponent: () => import('./features/mes-rendez-vous/mes-rendez-vous.component').then(m => m.MesRendezVousComponent),
      },
      {
        path: 'profil',
        canActivate: [authGuard, roleGuard(['patient'])],
        loadComponent: () => import('./features/profil/profil.component').then(m => m.ProfilComponent),
      },
      {
        path: 'services',
        loadComponent: () => import('./features/services/services.component').then(m => m.ServicesComponent),
      },
      {
        path: 'rappels',
        canActivate: [authGuard, roleGuard(['patient'])],
        loadComponent: () => import('./features/rappels/rappels.component').then(m => m.RappelsComponent),
      },
    ],
  },
  {
    path: 'secretaire',
    loadComponent: () => import('./layouts/secretaire-layout/secretaire-layout.component').then(m => m.SecretaireLayoutComponent),
    canActivate: [authGuard, roleGuard(['secretaire'])],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/secretaire/accueil/accueil.component').then(m => m.SecretaireAccueilComponent),
      },
      {
        path: 'accueil',
        loadComponent: () => import('./features/secretaire/accueil-bienvenue/accueil-bienvenue.component').then(m => m.SecretaireAccueilBienvenueComponent),
      },
      {
        path: 'demandes',
        loadComponent: () => import('./features/secretaire/demandes/demandes.component').then(m => m.DemandesComponent),
      },
      {
        path: 'rendez-vous',
        loadComponent: () => import('./features/secretaire/rendez-vous/rendez-vous.component').then(m => m.SecretaireRendezVousComponent),
      },
      {
        path: 'medecins',
        loadComponent: () => import('./features/secretaire/medecins/medecins.component').then(m => m.SecretaireMedecinsComponent),
      },
      {
        path: 'planning',
        loadComponent: () => import('./features/secretaire/planning/planning.component').then(m => m.GestionPlanningComponent),
      },
      {
        path: 'profil',
        loadComponent: () => import('./features/secretaire/profil/profil.component').then(m => m.SecretaireProfilComponent),
      },
    ],
  },
  {
    path: 'medecin',
    loadComponent: () => import('./layouts/medecin-layout/medecin-layout.component').then(m => m.MedecinLayoutComponent),
    canActivate: [authGuard, roleGuard(['medecin'])],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/medecin/accueil/accueil.component').then(m => m.MedecinAccueilComponent),
      },
      {
        path: 'accueil',
        loadComponent: () => import('./features/medecin/accueil-bienvenue/accueil-bienvenue.component').then(m => m.MedecinAccueilBienvenueComponent),
      },
      {
        path: 'planning',
        loadComponent: () => import('./features/medecin/planning/planning.component').then(m => m.MedecinPlanningComponent),
      },
      {
        path: 'gestion-planning',
        loadComponent: () => import('./features/medecin/gestion-planning/gestion-planning.component').then(m => m.MedecinGestionPlanningComponent),
      },
      {
        path: 'patients',
        loadComponent: () => import('./features/medecin/patients/patients.component').then(m => m.MedecinPatientsComponent),
      },
      {
        path: 'rendez-vous',
        loadComponent: () => import('./features/medecin/rendez-vous/rendez-vous.component').then(m => m.MedecinRendezVousComponent),
      },
      {
        path: 'profil',
        loadComponent: () => import('./features/medecin/profil/profil.component').then(m => m.MedecinProfilComponent),
      },
    ],
  },
  {
    path: 'admin',
    loadComponent: () => import('./layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, roleGuard(['administrateur'])],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/admin/accueil/accueil.component').then(m => m.AdminAccueilComponent),
      },
      {
        path: 'accueil',
        loadComponent: () => import('./features/admin/accueil-bienvenue/accueil-bienvenue.component').then(m => m.AdminAccueilBienvenueComponent),
      },
      {
        path: 'utilisateurs',
        loadComponent: () => import('./features/admin/utilisateurs/utilisateurs.component').then(m => m.AdminUtilisateursComponent),
      },
      {
        path: 'services',
        loadComponent: () => import('./features/admin/services/services.component').then(m => m.AdminServicesComponent),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/admin/notifications/notifications.component').then(m => m.AdminNotificationsComponent),
      },
      {
        path: 'rapport',
        loadComponent: () => import('./features/admin/rapport/rapport.component').then(m => m.AdminRapportComponent),
      },
      {
        path: 'securite',
        loadComponent: () => import('./features/admin/securite/securite.component').then(m => m.AdminSecuriteComponent),
      },

      {
        path: 'profil',
        loadComponent: () => import('./features/admin/profil/profil.component').then(m => m.AdminProfilComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'connexion' },
];