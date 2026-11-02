import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendezVousService, RendezVousItem } from '../../core/rendez-vous.service';

type CleRappel = 'rappel_48h_envoye' | 'rappel_24h_envoye' | 'rappel_jourj_envoye' | 'rappel_2h_envoye';

interface TypeRappel {
  cle: CleRappel;
  etiquette: string;
  // Nombre d'heures avant le rendez-vous, utilisé pour trier du plus récent au plus ancien.
  // Pour « jour J », la valeur sert uniquement à l'ordre d'affichage.
  heures: number;
}

const TYPES_RAPPEL: TypeRappel[] = [
  { cle: 'rappel_48h_envoye', etiquette: '48 h avant', heures: 48 },
  { cle: 'rappel_24h_envoye', etiquette: '24 h avant', heures: 24 },
  { cle: 'rappel_jourj_envoye', etiquette: 'le jour du rendez-vous', heures: 6 },
  { cle: 'rappel_2h_envoye', etiquette: '2 h avant', heures: 2 },
];

export interface LigneRappel {
  id: string;
  rdv: RendezVousItem;
  etiquette: string;
  ordre: number;
}

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

  // Rappels réellement envoyés au patient, du plus récent au plus ancien
  rappelsRecus = computed<LigneRappel[]>(() => {
    const lignes: LigneRappel[] = [];

    for (const rdv of this.rendezVous()) {
      const debut = this.debutRdv(rdv).getTime();
      for (const type of TYPES_RAPPEL) {
        if (rdv[type.cle]) {
          lignes.push({
            id: `${rdv.id}-${type.cle}`,
            rdv,
            etiquette: type.etiquette,
            ordre: debut - type.heures * 3600000,
          });
        }
      }
    }

    return lignes.sort((a, b) => b.ordre - a.ordre);
  });

  ngOnInit(): void {
    this.rendezVousService.lister().subscribe({
      next: (data) => {
        // Seuls les rendez-vous confirmés ont des rappels
        this.rendezVous.set(data.filter((r) => r.status === 'confirme'));
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger vos rappels.');
        this.loading.set(false);
      },
    });
  }

  nomMedecin(rdv: RendezVousItem): string {
    return `Dr ${rdv.medecin.prenom} ${rdv.medecin.nom}`;
  }

  dateRdv(rdv: RendezVousItem): string {
    return this.debutRdv(rdv).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  heureRdv(rdv: RendezVousItem): string {
    return rdv.heure_rendez_vous.substring(0, 5);
  }

  private debutRdv(rdv: RendezVousItem): Date {
    const [a, m, j] = rdv.date_rendez_vous.substring(0, 10).split('-').map(Number);
    const [h, min] = rdv.heure_rendez_vous.substring(0, 5).split(':').map(Number);
    return new Date(a, m - 1, j, h, min);
  }
}