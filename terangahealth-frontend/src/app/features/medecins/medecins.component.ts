import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MedecinsService, Medecin } from '../../core/medecins.service';

@Component({
  selector: 'app-medecins',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './medecins.component.html',
  styleUrl: './medecins.component.css',
})
export class MedecinsComponent implements OnInit {
  private medecinsService = inject(MedecinsService);
  private router = inject(Router);

  medecins = signal<Medecin[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  recherche = signal('');
  specialiteActive = signal('Toutes');

  specialites = computed(() => {
    const noms = this.medecins()
      .map((m) => m.service?.nom)
      .filter((nom): nom is string => !!nom);
    return ['Toutes', ...new Set(noms)];
  });

  medecinsFiltres = computed(() => {
    const terme = this.recherche().toLowerCase().trim();
    const specialite = this.specialiteActive();

    return this.medecins().filter((m) => {
      const nomComplet = `${m.prenom} ${m.nom}`.toLowerCase();
      const serviceNom = m.service?.nom ?? '';
      const matchTexte = !terme || nomComplet.includes(terme) || serviceNom.toLowerCase().includes(terme);
      const matchSpecialite = specialite === 'Toutes' || serviceNom === specialite;
      return matchTexte && matchSpecialite;
    });
  });

  ngOnInit(): void {
    this.medecinsService.getMedecins().subscribe({
      next: (data) => {
        this.medecins.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger la liste des médecins.');
        this.loading.set(false);
      },
    });
  }

  selectSpecialite(nom: string): void {
    this.specialiteActive.set(nom);
  }

  prendreRdv(medecinId: number): void {
    this.router.navigate(['/prendre-rdv', medecinId]);
  }

  nomComplet(m: Medecin): string {
    return `Dr ${m.prenom} ${m.nom}`;
  }
}