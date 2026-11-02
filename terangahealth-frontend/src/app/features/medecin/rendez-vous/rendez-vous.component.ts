import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RendezVousService, RendezVousItem } from '../../../core/rendez-vous.service';

@Component({
  selector: 'app-medecin-rendez-vous',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rendez-vous.component.html',
  styleUrl: './rendez-vous.component.css',
})
export class MedecinRendezVousComponent implements OnInit {
  private rendezVousService = inject(RendezVousService);

  tousLesRendezVous = signal<RendezVousItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  filtreStatut = signal('tous');
  filtreDate = signal('');

  totalCount = computed(() => this.tousLesRendezVous().length);
  enAttenteCount = computed(() => this.tousLesRendezVous().filter((r) => r.status === 'en_attente').length);
  confirmeCount = computed(() => this.tousLesRendezVous().filter((r) => r.status === 'confirme').length);
  annuleCount = computed(() => this.tousLesRendezVous().filter((r) => r.status === 'annule').length);

  rendezVousFiltres = computed(() => {
    const statut = this.filtreStatut();
    const date = this.filtreDate();

    return this.tousLesRendezVous()
      .filter((rdv) => {
        const matchStatut = statut === 'tous' || rdv.status === statut;
        const matchDate = !date || rdv.date_rendez_vous === date;
        return matchStatut && matchDate;
      })
      .sort((a, b) => b.date_rendez_vous.localeCompare(a.date_rendez_vous));
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
        this.errorMessage.set('Impossible de charger vos rendez-vous.');
        this.loading.set(false);
      },
    });
  }

  effacerFiltres(): void {
    this.filtreStatut.set('tous');
    this.filtreDate.set('');
  }

  nomPatient(rdv: RendezVousItem): string {
    return `${rdv.patient.prenom} ${rdv.patient.nom}`;
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