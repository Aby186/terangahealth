import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RendezVousService, RendezVousItem } from '../../../core/rendez-vous.service';
import { MedecinsService, Creneau } from '../../../core/medecins.service';


@Component({
  selector: 'app-demandes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './demandes.component.html',
  styleUrl: './demandes.component.css',
})
export class DemandesComponent implements OnInit {
  private rendezVousService = inject(RendezVousService);
  private medecinsService = inject(MedecinsService);

  tousLesRendezVous = signal<RendezVousItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  traitementEnCoursId = signal<number | null>(null);

  // état pour "Voir" (détails dépliés) et "Reprogrammer" (formulaire de nouveau créneau)
  detailsOuvertId = signal<number | null>(null);
  reprogrammationOuverteId = signal<number | null>(null);
  nouvelleDateReprog = signal('');
  creneauxReprog = signal<Creneau[]>([]);
  loadingCreneauxReprog = signal(false);
  creneauChoisiId = signal<number | null>(null);

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

  ouvrirReprogrammation(rdv: RendezVousItem): void {
    this.reprogrammationOuverteId.set(rdv.id);
    this.nouvelleDateReprog.set('');
    this.creneauxReprog.set([]);
    this.creneauChoisiId.set(null);
  }

  fermerReprogrammation(): void {
    this.reprogrammationOuverteId.set(null);
  }

  onDateReprogChange(medecinId: number): void {
    const date = this.nouvelleDateReprog();
    if (!date) return;

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