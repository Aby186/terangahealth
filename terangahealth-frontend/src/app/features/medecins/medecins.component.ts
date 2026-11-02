import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MedecinsService, Medecin } from '../../core/medecins.service';

@Component({
  selector: 'app-medecins',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './medecins.component.html',
  styleUrl: './medecins.component.css',
})
export class MedecinsComponent implements OnInit {
  private medecinsService = inject(MedecinsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  medecins = signal<Medecin[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  recherche = signal('');
  specialiteActive = signal('Toutes');

  // Service choisi dans « Lister les services » (null = on affiche tous les médecins)
  serviceChoisi = signal<string | null>(null);

  specialites = computed(() => {
    const noms = this.medecins()
      .map((m) => m.service?.nom)
      .filter((nom): nom is string => !!nom);
    return ['Toutes', ...new Set(noms)];
  });

  medecinsFiltres = computed(() => {
    const terme = this.recherche().toLowerCase().trim();
    const service = this.serviceChoisi();
    const specialite = this.specialiteActive();

    const liste = this.medecins().filter((m) => {
      const nomComplet = `${m.prenom} ${m.nom}`.toLowerCase();
      const serviceNom = m.service?.nom ?? '';
      const matchTexte = !terme || nomComplet.includes(terme) || serviceNom.toLowerCase().includes(terme);

      // Si un service est choisi, on ne garde que ses médecins
      const matchService = service
        ? serviceNom === service
        : specialite === 'Toutes' || serviceNom === specialite;

      return matchTexte && matchService;
    });

    // Le Dr Bara est toujours affiché en premier, les autres gardent leur ordre
    const estBara = (m: Medecin) => `${m.prenom} ${m.nom}`.toLowerCase().includes('bara');
    return [...liste].sort((a, b) => Number(estBara(b)) - Number(estBara(a)));
  });

  ngOnInit(): void {
    this.serviceChoisi.set(this.route.snapshot.queryParamMap.get('service'));

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

  // Étape suivante du parcours : consulter le planning du médecin choisi
  voirPlanning(medecinId: number): void {
    this.router.navigate(['/medecins', medecinId, 'planning']);
  }

  nomComplet(m: Medecin): string {
    return `Dr ${m.prenom} ${m.nom}`;
  }
}