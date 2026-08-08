import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { RendezVousService, RendezVousItem } from '../../core/rendez-vous.service';

@Component({
  selector: 'app-medecin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './medecin-layout.component.html',
  styleUrl: './medecin-layout.component.css',
})
export class MedecinLayoutComponent implements OnInit {
  auth = inject(AuthService);
  private rendezVousService = inject(RendezVousService);

  menuOuvert = signal(false);
  sidebarReduite = signal(false);
  rendezVous = signal<RendezVousItem[]>([]);

  nombreNotifications = computed(() =>
    this.rendezVous().filter((r) => r.status === 'en_attente').length
  );

  ngOnInit(): void {
    this.rendezVousService.lister().subscribe({
      next: (data) => this.rendezVous.set(data),
    });
  }

  logout(): void {
    this.auth.logout();
  }

  toggleMenu(): void {
    this.menuOuvert.update((v) => !v);
  }

  toggleSidebar(): void {
    this.sidebarReduite.update((v) => !v);
  }

  initiales(): string {
    const u = this.auth.currentUser();
    if (!u) return '';
    return `${u.prenom.charAt(0)}${u.nom.charAt(0)}`;
  }

  nomComplet(): string {
    const u = this.auth.currentUser();
    return u ? `${u.prenom} ${u.nom}` : '';
  }
}