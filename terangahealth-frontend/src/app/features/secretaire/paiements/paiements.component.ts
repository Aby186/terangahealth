import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaiementService, PaiementHistorique } from '../../../core/paiement.service';

@Component({
  selector: 'app-secretaire-paiements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paiements.component.html',
  styleUrl: './paiements.component.css',
})
export class SecretairePaiementsComponent implements OnInit {
  private paiementService = inject(PaiementService);

  paiements = signal<PaiementHistorique[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  recherche = signal('');

  paiementsFiltres = computed(() => {
    const terme = this.recherche().toLowerCase().trim();
    if (!terme) return this.paiements();

    return this.paiements().filter((p) => {
      const texte = `${this.nomPatient(p)} ${this.nomMedecin(p)} ${this.reference(p)}`.toLowerCase();
      return texte.includes(terme);
    });
  });

  totalMontant = computed(() =>
    this.paiementsFiltres()
      .filter((p) => p.statut === 'paye')
      .reduce((somme, p) => somme + Number(p.montant), 0)
  );

  ngOnInit(): void {
    this.paiementService.historique().subscribe({
      next: (data) => {
        this.paiements.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger l\'historique des paiements.');
        this.loading.set(false);
      },
    });
  }

  nomPatient(p: PaiementHistorique): string {
    const rdv: any = p.rendez_vous;
    return rdv?.patient ? `${rdv.patient.prenom} ${rdv.patient.nom}` : 'Patient';
  }

  nomMedecin(p: PaiementHistorique): string {
    const rdv: any = p.rendez_vous;
    return rdv?.medecin ? `Dr ${rdv.medecin.prenom} ${rdv.medecin.nom}` : '';
  }

  service(p: PaiementHistorique): string {
    const rdv: any = p.rendez_vous;
    return rdv?.service?.nom ?? 'Consultation';
  }

  reference(p: PaiementHistorique): string {
    const rdv: any = p.rendez_vous;
    return rdv?.numero_rendez_vous ?? '';
  }

  formatMontant(montant: number | string): string {
    return Number(montant).toLocaleString('fr-FR');
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