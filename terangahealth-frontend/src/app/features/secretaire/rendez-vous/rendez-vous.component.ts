import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RendezVousService, RendezVousItem } from '../../../core/rendez-vous.service';

@Component({
  selector: 'app-secretaire-rendez-vous',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rendez-vous.component.html',
  styleUrl: './rendez-vous.component.css',
})
export class SecretaireRendezVousComponent implements OnInit {
  private rendezVousService = inject(RendezVousService);

  tousLesRendezVous = signal<RendezVousItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  traitementEnCoursId = signal<number | null>(null);
  listeOuverte = signal(false);

  filtreStatut = signal('tous');
  filtreDate = signal('');

  totalCount = computed(() => this.tousLesRendezVous().length);
  enAttenteCount = computed(() => this.tousLesRendezVous().filter((r) => r.status === 'en_attente').length);
  confirmeCount = computed(() => this.tousLesRendezVous().filter((r) => r.status === 'confirme').length);
  annuleCount = computed(() => this.tousLesRendezVous().filter((r) => r.status === 'annule').length);

  rendezVousFiltres = computed(() => {
    const statut = this.filtreStatut();
    const date = this.filtreDate();

    return this.tousLesRendezVous().filter((rdv) => {
      const matchStatut = statut === 'tous' || rdv.status === statut;
      const matchDate = !date || rdv.date_rendez_vous === date;
      return matchStatut && matchDate;
    });
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.loading.set(true);
    this.rendezVousService.lister().subscribe({
      next: (data) => {
        this.tousLesRendezVous.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les rendez-vous.');
        this.loading.set(false);
      },
    });
  }

  toggleListe(): void {
    this.listeOuverte.update((v) => !v);
  }

  effacerFiltres(): void {
    this.filtreStatut.set('tous');
    this.filtreDate.set('');
  }

  confirmer(id: number): void {
    this.traitementEnCoursId.set(id);
    this.rendezVousService.confirmer(id).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.charger();
      },
      error: () => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set('Impossible de confirmer ce rendez-vous.');
      },
    });
  }

  annuler(id: number): void {
    if (!confirm('Confirmer l\'annulation de ce rendez-vous ?')) return;

    this.traitementEnCoursId.set(id);
    this.rendezVousService.annuler(id).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.charger();
      },
      error: () => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set('Impossible d\'annuler ce rendez-vous.');
      },
    });
  }

  supprimer(id: number): void {
    if (!confirm('Supprimer définitivement ce rendez-vous ?')) return;

    this.traitementEnCoursId.set(id);
    this.rendezVousService.supprimer(id).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.charger();
      },
      error: () => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set('Impossible de supprimer ce rendez-vous.');
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
}