import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendezVousService, RendezVousItem } from '../../core/rendez-vous.service';

@Component({
  selector: 'app-rappels',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rappels.component.html',
  styleUrl: './rappels.component.css',
})
export class RappelsComponent implements OnInit {
  private rendezVousService = inject(RendezVousService);

  rendezVous = signal<RendezVousItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.rendezVousService.lister().subscribe({
      next: (data) => {
        // uniquement les RDV confirmés à venir ont des rappels programmés
        const aVenir = data.filter((r) => r.status === 'confirme');
        this.rendezVous.set(aVenir);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger vos rappels.');
        this.loading.set(false);
      },
    });
  }

  etapes(rdv: RendezVousItem) {
    return [
      { label: '48h avant', envoye: rdv.rappel_48h_envoye },
      { label: '24h avant', envoye: rdv.rappel_24h_envoye },
      { label: 'Jour J', envoye: rdv.rappel_jourj_envoye },
      { label: '2h avant', envoye: rdv.rappel_2h_envoye },
    ];
  }

  nomMedecin(rdv: RendezVousItem): string {
    return `Dr ${rdv.medecin.prenom} ${rdv.medecin.nom}`;
  }
}