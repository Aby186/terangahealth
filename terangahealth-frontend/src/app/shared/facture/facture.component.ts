import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { PaiementHistorique } from '../../core/paiement.service';

@Component({
  selector: 'app-facture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './facture.component.html',
  styleUrl: './facture.component.css',
})
export class FactureComponent {
  private authService = inject(AuthService);

  @Input() paiement: PaiementHistorique | null = null;
  @Input() open = false;
  @Output() close = new EventEmitter<void>();

  @ViewChild('dialogRef') dialogRef?: ElementRef<HTMLDialogElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        this.ouvrirDialog();
      } else {
        this.fermerDialog();
      }
    }
  }

  get patientNom(): string {
    const user = this.authService.currentUser();
    if (user) {
      return `${user.prenom} ${user.nom}`.trim();
    }

    const patient = this.paiement?.rendez_vous?.patient;
    if (patient) {
      return `${patient.prenom} ${patient.nom}`.trim();
    }

    return 'Patient';
  }

  get medecinNom(): string {
    const medecin = this.paiement?.rendez_vous?.medecin;
    if (!medecin) {
      return 'Médecin';
    }

    return `Dr ${medecin.prenom} ${medecin.nom}`.trim();
  }

  get serviceNom(): string {
    return this.paiement?.rendez_vous?.service?.nom ?? 'Consultation';
  }

  get numeroFacture(): string {
    return this.paiement?.rendez_vous?.numero_rendez_vous ?? '—';
  }

  get datePaiement(): string {
    return this.formatDateFr(this.paiement?.date_paiement ?? null);
  }

  get dateRendezVous(): string {
    const rdv = this.paiement?.rendez_vous as Record<string, unknown> | null;
    const date = this.extraitValeur(rdv, ['date_rendez_vous', 'date', 'date_rdv', 'date_du_rendez_vous']);
    return this.formatDateFr(date);
  }

  get heureRendezVous(): string {
    const rdv = this.paiement?.rendez_vous as Record<string, unknown> | null;
    const heure = this.extraitValeur(rdv, ['heure_rendez_vous', 'heure', 'heure_rdv', 'heure_debut']);
    return this.formatHeure(heure);
  }

  get montantTotal(): string {
    return this.formatMontant(this.paiement?.montant ?? 0);
  }

  ouvrirDialog(): void {
    const dialog = this.dialogRef?.nativeElement as HTMLDialogElement | undefined;
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }
  }

  fermerDialog(): void {
    const dialog = this.dialogRef?.nativeElement as HTMLDialogElement | undefined;
    if (dialog && dialog.open) {
      dialog.close();
    }
    this.close.emit();
  }

  imprimer(): void {
    window.print();
  }

  private extraitValeur(rdv: Record<string, unknown> | null, cles: string[]): string | null {
    if (!rdv) return null;

    for (const cle of cles) {
      const valeur = rdv[cle];
      if (typeof valeur === 'string' && valeur.trim()) {
        return valeur;
      }
    }

    return null;
  }

  private formatDateFr(dateStr: string | null): string {
    if (!dateStr) return '—';

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return dateStr;
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private formatHeure(valeur: string | null): string {
    if (!valeur) return '—';

    if (/^\d{2}:\d{2}(:\d{2})?$/.test(valeur)) {
      return valeur.slice(0, 5);
    }

    const date = new Date(valeur);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    }

    return valeur;
  }

  private formatMontant(valeur: string | number): string {
    const nombre = typeof valeur === 'number' ? valeur : Number(valeur || 0);

    return new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
    }).format(nombre);
  }
}
