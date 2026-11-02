import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaiementService, PaiementHistorique } from '../../core/paiement.service';
import { FactureComponent } from '../../shared/facture/facture.component';

@Component({
  selector: 'app-mes-paiements',
  standalone: true,
  imports: [CommonModule, FactureComponent],
  templateUrl: './mes-paiements.component.html',
  styleUrl: './mes-paiements.component.css',
})
export class MesPaiementsComponent implements OnInit {
  private paiementService = inject(PaiementService);

  paiements = signal<PaiementHistorique[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  paiementSelectionne = signal<PaiementHistorique | null>(null);
  factureOuverte = signal(false);

  ngOnInit(): void {
    this.paiementService.historique().subscribe({
      next: (data) => {
        this.paiements.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger votre historique de paiements.');
        this.loading.set(false);
      },
    });
  }

  ouvrirFacture(paiement: PaiementHistorique): void {
    this.paiementSelectionne.set(paiement);
    this.factureOuverte.set(true);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  statutLabel(statut: string): string {
    const labels: Record<string, string> = {
      en_attente: 'En attente',
      paye: 'Payé',
      echoue: 'Échoué',
    };
    return labels[statut] ?? statut;
  }
}
