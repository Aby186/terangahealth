import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { UtilisateursService, UtilisateurItem } from '../../../core/utilisateurs.service';
import { ServicesService, ServiceMedical } from '../../../core/services.service';

@Component({
  selector: 'app-admin-accueil',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.css',
})
export class AdminAccueilComponent implements OnInit {
  auth = inject(AuthService);
  private utilisateursService = inject(UtilisateursService);
  private servicesService = inject(ServicesService);

  utilisateurs = signal<UtilisateurItem[]>([]);
  services = signal<ServiceMedical[]>([]);
  loading = signal(true);

  totalUtilisateurs = computed(() => this.utilisateurs().length);
  totalMedecins = computed(() => this.utilisateurs().filter((u) => u.role === 'medecin').length);
  totalPatients = computed(() => this.utilisateurs().filter((u) => u.role === 'patient').length);
  totalServices = computed(() => this.services().length);

  ngOnInit(): void {
    this.utilisateursService.lister().subscribe({
      next: (data) => {
        this.utilisateurs.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.servicesService.getServices().subscribe({
      next: (data) => this.services.set(data),
    });
  }

  nomComplet(): string {
    const u = this.auth.currentUser();
    return u ? `${u.prenom} ${u.nom}` : '';
  }
}