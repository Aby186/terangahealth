import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendezVousService, RendezVousItem } from '../../../core/rendez-vous.service';

interface StatMois { mois: string; total: number; }
interface StatService { nom: string; total: number; pourcentage: number; }

@Component({
  selector: 'app-admin-rapport',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rapport.component.html',
  styleUrl: './rapport.component.css',
})
export class AdminRapportComponent implements OnInit {
  private rendezVousService = inject(RendezVousService);

  rendezVous = signal<RendezVousItem[]>([]);
  loading = signal(true);

  totalRdv = computed(() => this.rendezVous().length);
  totalAnnules = computed(() => this.rendezVous().filter(r => r.status === 'annule').length);
  tauxAbsences = computed(() => {
    const total = this.totalRdv();
    if (total === 0) return 0;
    return Math.round((this.totalAnnules() / total) * 100);
  });

  tendanceMensuelle = computed<StatMois[]>(() => {
    const mois = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const compteurs = new Array(12).fill(0);
    this.rendezVous().forEach(r => {
      const m = new Date(r.date_rendez_vous).getMonth();
      compteurs[m]++;
    });
    return mois.map((nom, i) => ({ mois: nom, total: compteurs[i] }));
  });

  maxTendance = computed(() => Math.max(...this.tendanceMensuelle().map(s => s.total), 1));

  specialitesDemandees = computed<StatService[]>(() => {
    const compteurs = new Map<string, number>();
    this.rendezVous().forEach(r => {
      const nom = r.service?.nom ?? 'Non spécifié';
      compteurs.set(nom, (compteurs.get(nom) ?? 0) + 1);
    });
    const total = this.rendezVous().length || 1;
    return Array.from(compteurs.entries())
      .map(([nom, total_service]) => ({ nom, total: total_service, pourcentage: Math.round((total_service / total) * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  });

  ngOnInit(): void {
    this.rendezVousService.lister().subscribe({
      next: (data) => { this.rendezVous.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  hauteurBarre(total: number): number {
    return Math.max(Math.round((total / this.maxTendance()) * 100), 4);
  }
}
