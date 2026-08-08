import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ChatbotComponent } from '../../features/chatbot/chatbot.component';

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ChatbotComponent],
  templateUrl: './patient-layout.component.html',
  styleUrl: './patient-layout.component.css',
})
export class PatientLayoutComponent {
  auth = inject(AuthService);

  menuOuvert = signal(false);
  sidebarReduite = signal(false);

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