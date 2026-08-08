import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtilisateursService, UtilisateurItem } from '../../../core/utilisateurs.service';

interface NotificationItem {
  type: 'nouveau_compte' | 'compte_bloque';
  titre: string;
  description: string;
  date: string;
}

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class AdminNotificationsComponent implements OnInit {
  private utilisateursService = inject(UtilisateursService);

  utilisateurs = signal<UtilisateurItem[]>([]);
  loading = signal(true);

  notifications = computed<NotificationItem[]>(() => {
    const septJoursAvant = new Date();
    septJoursAvant.setDate(septJoursAvant.getDate() - 7);

    const items: NotificationItem[] = [];

    this.utilisateurs().forEach((u) => {
      const creeLe = new Date(u.created_at);
      if (creeLe >= septJoursAvant) {
        items.push({
          type: 'nouveau_compte',
          titre: 'Nouveau compte créé',
          description: `${u.prenom} ${u.nom} (${this.roleLabel(u.role)}) a rejoint la plateforme.`,
          date: u.created_at,
        });
      }
      if (u.statut !== 'actif') {
        items.push({
          type: 'compte_bloque',
          titre: 'Compte bloqué',
          description: `Le compte de ${u.prenom} ${u.nom} est actuellement bloqué.`,
          date: u.created_at,
        });
      }
    });

    return items.sort((a, b) => b.date.localeCompare(a.date));
  });

  ngOnInit(): void {
    this.utilisateursService.lister().subscribe({
      next: (data) => {
        this.utilisateurs.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      patient: 'Patient', medecin: 'Médecin', secretaire: 'Secrétaire', administrateur: 'Administrateur',
    };
    return labels[role] ?? role;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
