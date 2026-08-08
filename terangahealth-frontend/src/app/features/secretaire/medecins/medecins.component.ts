import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MedecinsService, Medecin } from '../../../core/medecins.service';

@Component({
  selector: 'app-secretaire-medecins',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medecins.component.html',
  styleUrl: './medecins.component.css',
})
export class SecretaireMedecinsComponent implements OnInit {
  private medecinsService = inject(MedecinsService);

  medecins = signal<Medecin[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

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

  nomComplet(m: Medecin): string {
    return `Dr ${m.prenom} ${m.nom}`;
  }
}