import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MedecinsService, Medecin, Creneau } from '../../core/medecins.service';

interface JourPlanning {
  date: string;
  libelle: string;
  creneaux: Creneau[];
}

@Component({
  selector: 'app-planning-medecin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './planning-medecin.component.html',
  styleUrl: './planning-medecin.component.css',
})
export class PlanningMedecinComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private medecinsService = inject(MedecinsService);

  // Nombre de jours à venir affichés
  private readonly NB_JOURS = 10;

  medecinId = signal<number | null>(null);
  medecin = signal<Medecin | null>(null);
  jours = signal<JourPlanning[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('medecinId'));
    this.medecinId.set(id);

    this.medecinsService.getMedecins().subscribe({
      next: (medecins) => this.medecin.set(medecins.find((m) => m.id === id) ?? null),
    });

    this.chargerPlanning(id);
  }

  private chargerPlanning(medecinId: number): void {
    const dates: string[] = [];
    for (let i = 0; i < this.NB_JOURS; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(this.formatIso(d));
    }

    // Un appel par jour ; une erreur sur un jour = jour vide (pas de blocage de la page)
    const appels = dates.map((date) =>
      this.medecinsService.getCreneaux(medecinId, date).pipe(catchError(() => of([] as Creneau[])))
    );

    forkJoin(appels).subscribe({
      next: (resultats) => {
        const jours: JourPlanning[] = dates
          .map((date, i) => ({
            date,
            libelle: this.libelleJour(date),
            creneaux: resultats[i],
          }))
          .filter((j) => j.creneaux.length > 0);

        this.jours.set(jours);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger le planning.');
        this.loading.set(false);
      },
    });
  }

  private formatIso(d: Date): string {
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    const jour = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mois}-${jour}`;
  }

  private libelleJour(iso: string): string {
    const [a, m, j] = iso.split('-').map(Number);
    return new Date(a, m - 1, j).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  nomComplet(): string {
    const m = this.medecin();
    return m ? `Dr ${m.prenom} ${m.nom}` : '';
  }
}