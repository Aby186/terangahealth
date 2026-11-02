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
  dateRecherche = signal('');
  resultatRecherche = signal<PlanningItem | null>(null);
  messageRecherche = signal<string | null>(null);

  planningOuvertPourGenerationId = signal<number | null>(null);
  heureDebutGen = signal('09:00');
  heureFinGen = signal('17:00');
  dureeGen = signal(30);
  generationEnCours = signal(false);

  traitementEnCoursId = signal<number | null>(null);
  creneauTraitementId = signal<number | null>(null);

  private medecinId(): number | null {
    return this.auth.currentUser()?.id ?? null;
  }

  todayLocalDateString(): string {
    const now = new Date();
    return this.formatInputDate(now);
  }

  private formatInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Les dates venant du serveur peuvent contenir une heure
   * (ex. 2026-08-04T00:00:00.000000Z) : on ne garde que AAAA-MM-JJ.
   */
  private toLocalDate(dateValue: string): Date {
    const [year, month, day] = dateValue.substring(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private isDatePasse(dateValue: string): boolean {
    if (!dateValue) {
      return false;
    }

    return this.toLocalDate(dateValue) < this.toLocalDate(this.todayLocalDateString());
  }

  canModifyPlanning(planning: PlanningItem | null): boolean {
    return !!planning && !this.isDatePasse(planning.date_planning);
  }

  get planningsFuturs(): PlanningItem[] {
    return [...this.plannings()]
      .filter((planning) => !this.isDatePasse(planning.date_planning))
      .sort((a, b) => this.toLocalDate(a.date_planning).getTime() - this.toLocalDate(b.date_planning).getTime());
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
        const sorted = [...data].sort(
          (a, b) => this.toLocalDate(a.date_planning).getTime() - this.toLocalDate(b.date_planning).getTime()
        );
        this.plannings.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger votre planning.');
        this.loading.set(false);
      },
    });
  }

  rechercherJournee(): void {
    const date = this.dateRecherche().trim();
    if (!date) {
      this.resultatRecherche.set(null);
      this.messageRecherche.set(null);
      return;
    }

    const planningTrouve = this.plannings().find((planning) => planning.date_planning.substring(0, 10) === date);

    if (planningTrouve) {
      this.resultatRecherche.set(planningTrouve);
      this.messageRecherche.set(null);
      return;
    }

    this.resultatRecherche.set(null);
    this.messageRecherche.set('Aucune journée trouvée pour cette date.');
  }

  effacerRecherche(): void {
    this.dateRecherche.set('');
    this.resultatRecherche.set(null);
    this.messageRecherche.set(null);
  }

  creerPlanning(): void {
    const id = this.medecinId();
    const date = this.nouvelleDate();
    if (!id || !date) return;

    if (this.isDatePasse(date)) {
      this.errorMessage.set("Choisissez une date à partir d'aujourd'hui.");
      return;
    }

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
    const planning = this.plannings().find((item) => item.id === planningId);
    if (planning?.status === 'actif') {
      const rendezVousReserve = (planning.creneaux ?? []).filter((creneau) => creneau.status === 'reserve').length;
      if (rendezVousReserve > 0) {
        const confirmation = confirm(
          `Cette journée contient ${rendezVousReserve} rendez-vous réservés.\nEn la désactivant, la secrétaire devra les reprogrammer.\nContinuer ?`
        );
        if (!confirmation) {
          return;
        }
      }
    }

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

  bloquerCreneau(creneauId: number, statut: string): void {
    if (statut === 'reserve') {
      const confirmation = confirm(
        'Ce créneau contient un rendez-vous.\nEn le désactivant, la secrétaire devra le reprogrammer.\nContinuer ?'
      );
      if (!confirmation) {
        return;
      }
    }

    this.creneauTraitementId.set(creneauId);
    this.planningService.bloquerCreneau(creneauId).subscribe({
      next: (reponse) => {
        this.creneauTraitementId.set(null);
        this.successMessage.set(reponse.message);
        this.charger();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.creneauTraitementId.set(null);
        this.errorMessage.set(err.error?.message ?? 'Impossible de modifier ce créneau.');
      },
    });
  }

  formatDate(dateStr: string): string {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const date = this.toLocalDate(dateStr);
    return `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]}`;
  }
}