import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { PlanningService, PlanningItem } from '../../../core/planning.service';

@Component({
  selector: 'app-medecin-gestion-planning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-planning.component.html',
  styleUrl: './gestion-planning.component.css',
})
export class MedecinGestionPlanningComponent implements OnInit {
  private auth = inject(AuthService);
  private planningService = inject(PlanningService);

  plannings = signal<PlanningItem[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  nouvelleDate = signal('');
  creationEnCours = signal(false);

  planningOuvertPourGenerationId = signal<number | null>(null);
  heureDebutGen = signal('09:00');
  heureFinGen = signal('17:00');
  dureeGen = signal(30);
  generationEnCours = signal(false);

  traitementEnCoursId = signal<number | null>(null);

  private medecinId(): number | null {
    return this.auth.currentUser()?.id ?? null;
  }

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    const id = this.medecinId();
    if (!id) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.planningService.getPlannings(id).subscribe({
      next: (data) => {
        this.plannings.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger votre planning.');
        this.loading.set(false);
      },
    });
  }

  creerPlanning(): void {
    const id = this.medecinId();
    const date = this.nouvelleDate();
    if (!id || !date) return;

    this.creationEnCours.set(true);
    this.errorMessage.set(null);

    this.planningService.creerPlanning(id, date).subscribe({
      next: (res) => {
        this.creationEnCours.set(false);
        this.successMessage.set(res.message);
        this.nouvelleDate.set('');
        this.charger();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.creationEnCours.set(false);
        this.errorMessage.set(err.error?.message ?? 'Impossible de créer le planning.');
      },
    });
  }

  ouvrirGenerationCreneaux(planningId: number): void {
    this.planningOuvertPourGenerationId.set(planningId);
    this.heureDebutGen.set('09:00');
    this.heureFinGen.set('17:00');
    this.dureeGen.set(30);
  }

  fermerGenerationCreneaux(): void {
    this.planningOuvertPourGenerationId.set(null);
  }

  genererCreneaux(planningId: number): void {
    this.generationEnCours.set(true);
    this.errorMessage.set(null);

    this.planningService
      .genererCreneaux(planningId, this.heureDebutGen(), this.heureFinGen(), this.dureeGen())
      .subscribe({
        next: (res) => {
          this.generationEnCours.set(false);
          this.successMessage.set(res.message);
          this.planningOuvertPourGenerationId.set(null);
          this.charger();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (err) => {
          this.generationEnCours.set(false);
          this.errorMessage.set(err.error?.message ?? 'Impossible de générer les créneaux.');
        },
      });
  }

  toggleStatus(planningId: number): void {
    this.traitementEnCoursId.set(planningId);
    this.planningService.toggleStatus(planningId).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.charger();
      },
      error: () => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set('Impossible de modifier le statut du planning.');
      },
    });
  }

  supprimerPlanning(planningId: number): void {
    if (!confirm('Supprimer définitivement cette journée de planning ?')) return;

    this.traitementEnCoursId.set(planningId);
    this.planningService.supprimerPlanning(planningId).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.charger();
      },
      error: (err) => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set(err.error?.message ?? 'Impossible de supprimer ce planning.');
      },
    });
  }

  supprimerCreneau(creneauId: number): void {
    if (!confirm('Supprimer ce créneau ?')) return;

    this.planningService.supprimerCreneau(creneauId).subscribe({
      next: () => this.charger(),
      error: (err) => {
        this.errorMessage.set(err.error?.message ?? 'Impossible de supprimer ce créneau.');
      },
    });
  }

  formatDate(dateStr: string): string {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const date = new Date(dateStr);
    return `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]}`;
  }
}