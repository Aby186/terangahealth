import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedecinsService, Medecin } from '../../../core/medecins.service';
import { PlanningService, PlanningItem } from '../../../core/planning.service';

@Component({
  selector: 'app-gestion-planning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planning.component.html',
  styleUrl: './planning.component.css',
})
export class GestionPlanningComponent implements OnInit {
  private medecinsService = inject(MedecinsService);
  private planningService = inject(PlanningService);

  medecins = signal<Medecin[]>([]);
  medecinSelectionneId = signal<number | null>(null);
  plannings = signal<PlanningItem[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.medecinsService.getMedecins().subscribe({
      next: (data) => this.medecins.set(data),
    });
  }

  onMedecinChange(): void {
    const id = this.medecinSelectionneId();
    if (!id) return;
    this.charger(id);
  }

  charger(medecinId: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.planningService.getPlannings(medecinId).subscribe({
      next: (data) => {
        this.plannings.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger le planning.');
        this.loading.set(false);
      },
    });
  }

  nomMedecin(m: Medecin): string {
    return `Dr ${m.prenom} ${m.nom}`;
  }

  formatDate(dateStr: string): string {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const date = new Date(dateStr);
    return `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]}`;
  }
}