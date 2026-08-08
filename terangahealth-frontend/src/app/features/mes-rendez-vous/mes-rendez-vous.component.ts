import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RendezVousService, RendezVousItem } from '../../core/rendez-vous.service';

@Component({
  selector: 'app-mes-rendez-vous',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mes-rendez-vous.component.html',
  styleUrl: './mes-rendez-vous.component.css',
})
export class MesRendezVousComponent implements OnInit {
  private rendezVousService = inject(RendezVousService);

  rendezVous = signal<RendezVousItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  cancellingId = signal<number | null>(null);

  totalCount = computed(() => this.rendezVous().length);
  enAttenteCount = computed(() => this.rendezVous().filter((r) => r.status === 'en_attente').length);
  confirmeCount = computed(() => this.rendezVous().filter((r) => r.status === 'confirme').length);
  annuleCount = computed(() => this.rendezVous().filter((r) => r.status === 'annule').length);

  // id du rendez-vous -> position dans l'historique avec ce médecin (1 = premier)
  private ordresConsultation = new Map<number, number>();

  ngOnInit(): void {
    this.charger();
  }

  private calculerTypesConsultation(): void {
    this.ordresConsultation.clear();

    const parMedecin = new Map<number, RendezVousItem[]>();
    for (const rdv of this.rendezVous()) {
      const liste = parMedecin.get(rdv.medecin_id) ?? [];
      liste.push(rdv);
      parMedecin.set(rdv.medecin_id, liste);
    }

    for (const liste of parMedecin.values()) {
      const triee = [...liste].sort((a, b) =>
        `${a.date_rendez_vous}${a.heure_rendez_vous}`.localeCompare(`${b.date_rendez_vous}${b.heure_rendez_vous}`)
      );
      triee.forEach((rdv, index) => {
        this.ordresConsultation.set(rdv.id, index + 1);
      });
    }
  }

  labelConsultation(rdv: RendezVousItem): string {
    const ordre = this.ordresConsultation.get(rdv.id) ?? 1;
    if (ordre === 1) return 'Première consultation';
    return `${ordre}ᵉ consultation`;
  }

  estPremiereConsultation(rdv: RendezVousItem): boolean {
    return (this.ordresConsultation.get(rdv.id) ?? 1) === 1;
  }

  charger(): void {
    this.loading.set(true);
    this.rendezVousService.lister().subscribe({
      next: (data) => {
        this.rendezVous.set(data);
        this.calculerTypesConsultation();
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger vos rendez-vous.');
        this.loading.set(false);
      },
    });
  }

  annuler(id: number): void {
    if (!confirm('Confirmer l\'annulation de ce rendez-vous ?')) return;

    this.cancellingId.set(id);
    this.rendezVousService.annuler(id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.charger();
      },
      error: () => {
        this.cancellingId.set(null);
        this.errorMessage.set('Impossible d\'annuler ce rendez-vous.');
      },
    });
  }

  nomMedecin(rdv: RendezVousItem): string {
    return `Dr ${rdv.medecin.prenom} ${rdv.medecin.nom}`;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      en_attente: 'En attente',
      confirme: 'Confirmé',
      annule: 'Annulé',
    };
    return labels[status] ?? status;
  }

  formatDate(dateStr: string): string {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const date = new Date(dateStr);
    return `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]}`;
  }

  listeOuverte = signal(false);

  toggleListe(): void {
    this.listeOuverte.update((v) => !v);
  }
}