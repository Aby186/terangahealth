import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { RendezVousService, RendezVousItem } from '../../../core/rendez-vous.service';

@Component({
  selector: 'app-secretaire-accueil',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.css',
})
export class SecretaireAccueilComponent implements OnInit {
  auth = inject(AuthService);
  private rendezVousService = inject(RendezVousService);

  tousLesRendezVous = signal<RendezVousItem[]>([]);
  loading = signal(true);

  totalRendezVous = computed(() => this.tousLesRendezVous().length);
  totalAnnules = computed(() => this.tousLesRendezVous().filter((r) => r.status === 'annule').length);
 totalPatients = computed(() => {
    const ids = this.tousLesRendezVous().map((r) => r.patient_id).filter((id) => id != null);
    return new Set(ids).size;
  });

  ngOnInit(): void {
    this.rendezVousService.lister().subscribe({
      next: (data) => {
        this.tousLesRendezVous.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  pourcentagePatientsActifs = computed(() => {
    const total = this.totalPatients();
    if (total === 0) return 0;
    const confirmesIds = new Set(
      this.tousLesRendezVous().filter((r) => r.status === 'confirme').map((r) => r.patient_id)
    );
    return Math.round((confirmesIds.size / total) * 100);
  });

  pourcentageConfirmes = computed(() => {
    const total = this.totalRendezVous();
    if (total === 0) return 0;
    const confirmes = this.tousLesRendezVous().filter((r) => r.status === 'confirme').length;
    return Math.round((confirmes / total) * 100);
  });

  pourcentageAnnules = computed(() => {
    const total = this.totalRendezVous();
    if (total === 0) return 0;
    return Math.round((this.totalAnnules() / total) * 100);
  });

  nomComplet(): string {
    const u = this.auth.currentUser();
    return u ? `${u.prenom} ${u.nom}` : '';
  }
}