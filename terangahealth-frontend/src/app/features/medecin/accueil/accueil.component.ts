import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { RendezVousService, RendezVousItem } from '../../../core/rendez-vous.service';

@Component({
  selector: 'app-medecin-accueil',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.css',
})
export class MedecinAccueilComponent implements OnInit {
  auth = inject(AuthService);
  private rendezVousService = inject(RendezVousService);

  tousLesRendezVous = signal<RendezVousItem[]>([]);
  loading = signal(true);

  totalRendezVous = computed(() => this.tousLesRendezVous().length);

  totalPatients = computed(() => {
    const ids = this.tousLesRendezVous().map((r) => r.patient_id);
    return new Set(ids).size;
  });

  rdvAujourdhui = computed(() => {
    const aujourdhui = new Date().toISOString().substring(0, 10);
    return this.tousLesRendezVous().filter((r) => r.date_rendez_vous === aujourdhui).length;
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

  nomComplet(): string {
    const u = this.auth.currentUser();
    return u ? `Dr ${u.prenom} ${u.nom}` : '';
  }
}