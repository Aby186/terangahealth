import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { UtilisateursService, UtilisateurItem } from '../../core/utilisateurs.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit {
  auth = inject(AuthService);
  private utilisateursService = inject(UtilisateursService);

  menuOuvert = signal(false);
  sidebarReduite = signal(false);
  utilisateurs = signal<UtilisateurItem[]>([]);

  nombreNotifications = computed(() => {
    const septJoursAvant = new Date();
    septJoursAvant.setDate(septJoursAvant.getDate() - 7);

    return this.utilisateurs().filter((u) => {
      const creeLe = new Date(u.created_at);
      return creeLe >= septJoursAvant;
    }).length;
  });

  ngOnInit(): void {
    this.utilisateursService.lister().subscribe({
      next: (data) => this.utilisateurs.set(data),
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
