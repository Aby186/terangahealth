import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RendezVousService, RendezVousItem } from '../../../core/rendez-vous.service';
import { MedecinsService, Creneau } from '../../../core/medecins.service';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-medecin-rendez-vous',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rendez-vous.component.html',
  styleUrl: './rendez-vous.component.css',
})
export class MedecinRendezVousComponent implements OnInit {
  private rendezVousService = inject(RendezVousService);
  private medecinsService = inject(MedecinsService);
  private auth = inject(AuthService);

  tousLesRendezVous = signal<RendezVousItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  traitementEnCoursId = signal<number | null>(null);

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

  // ---------- Reprogrammation ----------
  reprogrammationOuverteId = signal<number | null>(null);
  nouvelleDateReprog = signal('');
  creneauxReprog = signal<Creneau[]>([]);
  loadingCreneauxReprog = signal(false);
  creneauChoisiId = signal<number | null>(null);

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

  ouvrirReprogrammation(rdv: RendezVousItem): void {
    this.reprogrammationOuverteId.set(rdv.id);
    this.nouvelleDateReprog.set('');
    this.creneauxReprog.set([]);
    this.creneauChoisiId.set(null);
  }

  fermerReprogrammation(): void {
    this.reprogrammationOuverteId.set(null);
  }

  onDateReprogChange(): void {
    const medecinId = this.auth.currentUser()?.id;
    const date = this.nouvelleDateReprog();
    if (!medecinId || !date) return;

    this.loadingCreneauxReprog.set(true);
    this.creneauChoisiId.set(null);

    this.medecinsService.getCreneaux(medecinId, date).subscribe({
      next: (data) => {
        this.creneauxReprog.set(data);
        this.loadingCreneauxReprog.set(false);
      },
      error: () => {
        this.loadingCreneauxReprog.set(false);
      },
    });
  }

  confirmerReprogrammation(rdvId: number): void {
    const creneauId = this.creneauChoisiId();
    if (!creneauId) return;

    this.traitementEnCoursId.set(rdvId);
    this.rendezVousService.reprogrammer(rdvId, creneauId).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.reprogrammationOuverteId.set(null);
        this.charger();
      },
      error: (err) => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set(err.error?.message ?? 'Impossible de reprogrammer ce rendez-vous.');
      },
    });
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