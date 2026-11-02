import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendezVousService, RendezVousItem } from '../../../core/rendez-vous.service';

@Component({
  selector: 'app-demandes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './demandes.component.html',
  styleUrl: './demandes.component.css',
})
export class DemandesComponent implements OnInit {
  private rendezVousService = inject(RendezVousService);

  tousLesRendezVous = signal<RendezVousItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  traitementEnCoursId = signal<number | null>(null);

  // état pour "Voir" (détails dépliés)
  detailsOuvertId = signal<number | null>(null);

  demandesEnAttente = computed(() =>
    this.tousLesRendezVous()
      .filter((r) => r.status === 'en_attente')
      .sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1))
  );

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
        this.errorMessage.set('Impossible de charger les demandes.');
        this.loading.set(false);
      },
    });
  }

  toggleDetails(id: number): void {
    this.detailsOuvertId.set(this.detailsOuvertId() === id ? null : id);
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

  refuser(id: number): void {
    if (!confirm('Confirmer le refus de cette demande de rendez-vous ?')) return;

    this.traitementEnCoursId.set(id);
    this.rendezVousService.refuser(id).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.charger();
      },
      error: () => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set('Impossible de refuser ce rendez-vous.');
      },
    });
  }

  nomMedecin(rdv: RendezVousItem): string {
    return `Dr ${rdv.medecin.prenom} ${rdv.medecin.nom}`;
  }

  formatDate(dateStr: string): string {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const date = new Date(dateStr);
    return `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]}`;
  }
}