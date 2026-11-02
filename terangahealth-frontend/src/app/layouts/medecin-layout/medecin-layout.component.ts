import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { MessageService, Conversation } from '../../core/message.service';

@Component({
  selector: 'app-medecin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './medecin-layout.component.html',
  styleUrl: './medecin-layout.component.css',
})
export class MedecinLayoutComponent implements OnInit {
  auth = inject(AuthService);
  private messageService = inject(MessageService);

  menuOuvert = signal(false);
  sidebarReduite = signal(false);
  conversations = signal<Conversation[]>([]);

  nombreMessagesNonLus = computed(() =>
    this.conversations().reduce((total, c) => total + c.non_lus, 0)
  );

  ngOnInit(): void {
    this.messageService.conversations().subscribe({
      next: (data) => this.conversations.set(data),
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