import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';

const CONSEILS_SANTE = [
  "Marchez au moins 30 minutes par jour pour renforcer votre cœur.",
  "Limitez le sel dans votre alimentation pour préserver votre tension artérielle.",
  "Buvez suffisamment d'eau tout au long de la journée.",
  "Privilégiez les fruits et légumes frais à chaque repas.",
  "Accordez-vous des pauses régulières pour réduire le stress.",
  "Un sommeil de qualité est essentiel à la santé cardiovasculaire.",
  "Évitez la sédentarité prolongée : levez-vous régulièrement.",
  "Le tabac est l'un des principaux facteurs de risque cardiovasculaire.",
  "Surveillez régulièrement votre tension artérielle.",
  "L'activité physique régulière réduit le risque de maladies cardiaques.",
  "Favorisez les graisses saines comme l'huile d'olive et les poissons gras.",
  "Un contrôle médical régulier permet une détection précoce des risques.",
  "Riez souvent : le rire a un effet positif sur le système cardiovasculaire.",
  "Réduisez votre consommation de sucre pour protéger vos artères.",
  "Prenez le temps de respirer profondément pour apaiser votre rythme cardiaque.",
];

@Component({
  selector: 'app-patient-accueil-bienvenue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accueil-bienvenue.component.html',
  styleUrl: './accueil-bienvenue.component.css',
})
export class PatientAccueilBienvenueComponent {
  private auth = inject(AuthService);

  conseilDuJour = computed(() => {
    const jourDeAnnee = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return CONSEILS_SANTE[jourDeAnnee % CONSEILS_SANTE.length];
  });

  salutation(): string {
    const heure = new Date().getHours();
    if (heure < 5) return 'Bonsoir';
    if (heure < 18) return 'Bonjour';
    return 'Bonsoir';
  }

  prenom(): string {
    const u = this.auth.currentUser();
    return u ? u.prenom : '';
  }

  dateAujourdhui(): string {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }
}
