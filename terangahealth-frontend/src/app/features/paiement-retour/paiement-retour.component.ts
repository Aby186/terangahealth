import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FactureComponent } from '../../shared/facture/facture.component';
import { PaiementHistorique, PaiementService } from '../../core/paiement.service';

interface PaiementStatut {
  statut: 'en_attente' | 'paye' | 'echoue';
  rendez_vous_id: number | null;
}

@Component({
  selector: 'app-paiement-retour',
  standalone: true,
  imports: [CommonModule, RouterLink, FactureComponent],
  templateUrl: './paiement-retour.component.html',
  styleUrl: './paiement-retour.component.css',
})
export class PaiementRetourComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paiementService = inject(PaiementService);

  verification = signal(true);
  paiement = signal<PaiementStatut | null>(null);
  facturePaiement = signal<PaiementHistorique | null>(null);
  factureOuverte = signal(false);
  factureEnCours = signal(false);
  factureErreur = signal<string | null>(null);
  tentatives = signal(0);
  private intervalId: any;
  private paiementId = 0;

  ngOnInit(): void {
    this.paiementId = Number(this.route.snapshot.queryParamMap.get('paiement_id'));

    if (!this.paiementId) {
      this.verification.set(false);
      return;
    }

    this.verifier();

    // L'IPN peut mettre quelques secondes à arriver après le retour du
    // patient sur le site — on revérifie automatiquement toutes les
    // 3 secondes, jusqu'à 10 fois.
    this.intervalId = setInterval(() => {
      this.tentatives.update((v) => v + 1);

      if (this.paiement()?.statut === 'paye' || this.tentatives() >= 10) {
        clearInterval(this.intervalId);
        return;
      }

      this.verifier();
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  verifier(): void {
    if (!this.paiementId) return;

    this.verification.set(true);

    this.paiementService.statut(this.paiementId).subscribe({
      next: (res) => {
        this.paiement.set(res as PaiementStatut);
        this.verification.set(false);

        if (res.statut === 'paye') {
          this.chargerFacture();
        }

        if (this.intervalId) {
          clearInterval(this.intervalId);
        }
      },
      error: () => {
        this.verification.set(false);
      },
    });
  }

  ouvrirFacture(): void {
    if (!this.facturePaiement()) return;
    this.factureOuverte.set(true);
  }

  private chargerFacture(): void {
    this.factureEnCours.set(true);
    this.factureErreur.set(null);

    this.paiementService.historique().subscribe({
      next: (historique) => {
        const paiement = historique.find((item) => item.id === this.paiementId) ?? null;

        if (paiement) {
          this.facturePaiement.set(paiement);
          this.factureEnCours.set(false);
          return;
        }

        this.facturePaiement.set(null);
        this.factureErreur.set('Votre facture sera disponible dans Mes paiements.');
        this.factureEnCours.set(false);
      },
      error: () => {
        this.facturePaiement.set(null);
        this.factureErreur.set('Votre facture sera disponible dans Mes paiements.');
        this.factureEnCours.set(false);
      },
    });
  }
}