import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RendezVousService, RendezVousItem } from '../../../core/rendez-vous.service';

interface PatientResume {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  sexe: string | null;
  dateNaissance: string | null;
  totalRdv: number;
  dernierRdv: string | null;
  actif: boolean;
}

@Component({
  selector: 'app-medecin-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients.component.html',
  styleUrl: './patients.component.css',
})
export class MedecinPatientsComponent implements OnInit {
  private rendezVousService = inject(RendezVousService);

  tousLesRendezVous = signal<RendezVousItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  recherche = signal('');
  ligneOuverteId = signal<number | null>(null);

  patients = computed<PatientResume[]>(() => {
    const parPatient = new Map<number, RendezVousItem[]>();

    for (const rdv of this.tousLesRendezVous()) {
      const liste = parPatient.get(rdv.patient.id) ?? [];
      liste.push(rdv);
      parPatient.set(rdv.patient.id, liste);
    }

    const resultats: PatientResume[] = [];

    parPatient.forEach((rdvs, patientId) => {
      const p = rdvs[0].patient;
      const trie = [...rdvs].sort((a, b) => b.date_rendez_vous.localeCompare(a.date_rendez_vous));
      const actif = rdvs.some((r) => r.status === 'en_attente' || r.status === 'confirme');

      resultats.push({
        id: patientId,
        nom: p.nom,
        prenom: p.prenom,
        email: p.email,
        telephone: p.telephone,
        sexe: p.sexe,
        dateNaissance: p.date_naissance,
        totalRdv: rdvs.length,
        dernierRdv: trie[0]?.date_rendez_vous ?? null,
        actif,
      });
    });

    return resultats.sort((a, b) => a.nom.localeCompare(b.nom));
  });

  patientsFiltres = computed(() => {
    const terme = this.recherche().toLowerCase().trim();
    if (!terme) return this.patients();

    return this.patients().filter((p) =>
      this.nomComplet(p).toLowerCase().includes(terme) || p.email.toLowerCase().includes(terme)
    );
  });

  totalPatients = computed(() => this.patients().length);
  patientsActifs = computed(() => this.patients().filter((p) => p.actif).length);
  avecRendezVous = computed(() => this.patients().filter((p) => p.totalRdv > 0).length);

  ngOnInit(): void {
    this.rendezVousService.lister().subscribe({
      next: (data) => {
        this.tousLesRendezVous.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger vos patients.');
        this.loading.set(false);
      },
    });
  }

  toggleLigne(patientId: number): void {
    this.ligneOuverteId.set(this.ligneOuverteId() === patientId ? null : patientId);
  }

  historiqueDuPatient(patientId: number): RendezVousItem[] {
    return this.tousLesRendezVous()
      .filter((r) => r.patient.id === patientId)
      .sort((a, b) => b.date_rendez_vous.localeCompare(a.date_rendez_vous));
  }

  nomComplet(p: PatientResume): string {
    return `${p.prenom} ${p.nom}`;
  }

  initiales(p: PatientResume): string {
    return `${p.prenom.charAt(0)}${p.nom.charAt(0)}`;
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      en_attente: 'En attente',
      confirme: 'Confirmé',
      annule: 'Annulé',
    };
    return labels[status] ?? status;
  }
}