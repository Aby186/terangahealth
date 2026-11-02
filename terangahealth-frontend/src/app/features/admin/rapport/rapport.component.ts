import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendezVousService, RendezVousItem } from '../../../core/rendez-vous.service';

type Periode = 3 | 6 | 12;

interface StatMois {
  cle: string;
  libelle: string;
  total: number;
  courant: boolean;
}

interface StatStatut {
  cle: string;
  libelle: string;
  total: number;
  pourcentage: number;
  classe: string;
}

interface StatService {
  nom: string;
  total: number;
  pourcentage: number;
}

interface StatMedecin {
  nom: string;
  total: number;
  pourcentage: number;
}

@Component({
  selector: 'app-admin-rapport',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rapport.component.html',
  styleUrl: './rapport.component.css',
})
export class AdminRapportComponent implements OnInit {
  private rendezVousService = inject(RendezVousService);

  rendezVous = signal<RendezVousItem[]>([]);
  loading = signal(true);
  periode = signal<Periode>(6);

  readonly periodes: { valeur: Periode; libelle: string }[] = [
    { valeur: 3, libelle: '3 mois' },
    { valeur: 6, libelle: '6 mois' },
    { valeur: 12, libelle: '12 mois' },
  ];

  private readonly MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  // La période commence le 1er du mois, (N-1) mois avant le mois en cours, et finit à la fin du mois en cours
  private debutPeriode = computed(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - (this.periode() - 1), 1);
  });

  private finPeriode = computed(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  });

  // Tous les chiffres de la page sont calculés sur la période choisie
  rdvPeriode = computed(() => {
    const debut = this.debutPeriode().getTime();
    const fin = this.finPeriode().getTime();
    return this.rendezVous().filter((r) => {
      const t = this.dateRdv(r).getTime();
      return t >= debut && t <= fin;
    });
  });

  totalRdv = computed(() => this.rdvPeriode().length);
  confirmes = computed(() => this.rdvPeriode().filter((r) => r.status === 'confirme').length);
  enAttente = computed(() => this.rdvPeriode().filter((r) => r.status === 'en_attente').length);
  annules = computed(() => this.rdvPeriode().filter((r) => r.status === 'annule').length);
  urgents = computed(() => this.rdvPeriode().filter((r) => r.urgent).length);
  patientsSuivis = computed(() => new Set(this.rdvPeriode().map((r) => r.patient_id)).size);

  tauxAnnulation = computed(() => {
    const total = this.totalRdv();
    return total === 0 ? 0 : Math.round((this.annules() / total) * 100);
  });

  // Une barre par mois de la période, année comprise ; un mois sans rendez-vous vaut 0
  tendanceMensuelle = computed<StatMois[]>(() => {
    const now = new Date();
    const compteurs = new Map<string, number>();

    this.rdvPeriode().forEach((r) => {
      const d = this.dateRdv(r);
      const cle = `${d.getFullYear()}-${d.getMonth()}`;
      compteurs.set(cle, (compteurs.get(cle) ?? 0) + 1);
    });

    const mois: StatMois[] = [];
    for (let i = this.periode() - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cle = `${d.getFullYear()}-${d.getMonth()}`;
      mois.push({
        cle,
        libelle: `${this.MOIS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        total: compteurs.get(cle) ?? 0,
        courant: i === 0,
      });
    }
    return mois;
  });

  maxTendance = computed(() => Math.max(...this.tendanceMensuelle().map((s) => s.total), 1));

  statuts = computed<StatStatut[]>(() => {
    const total = this.totalRdv() || 1;
    const base = [
      { cle: 'confirme', libelle: 'Confirmés', total: this.confirmes(), classe: 'st-confirme' },
      { cle: 'en_attente', libelle: 'En attente', total: this.enAttente(), classe: 'st-attente' },
      { cle: 'annule', libelle: 'Annulés', total: this.annules(), classe: 'st-annule' },
    ];
    return base.map((s) => ({ ...s, pourcentage: Math.round((s.total / total) * 100) }));
  });

  specialitesDemandees = computed<StatService[]>(() => {
    const compteurs = new Map<string, number>();
    this.rdvPeriode().forEach((r) => {
      const nom = r.service?.nom ?? 'Non spécifié';
      compteurs.set(nom, (compteurs.get(nom) ?? 0) + 1);
    });
    const total = this.totalRdv() || 1;
    return Array.from(compteurs.entries())
      .map(([nom, n]) => ({ nom, total: n, pourcentage: Math.round((n / total) * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  });

  medecinsSollicites = computed<StatMedecin[]>(() => {
    const compteurs = new Map<number, { nom: string; total: number }>();
    this.rdvPeriode().forEach((r) => {
      const actuel = compteurs.get(r.medecin_id);
      if (actuel) {
        actuel.total++;
      } else {
        compteurs.set(r.medecin_id, { nom: `Dr ${r.medecin.prenom} ${r.medecin.nom}`, total: 1 });
      }
    });
    const liste = Array.from(compteurs.values()).sort((a, b) => b.total - a.total).slice(0, 5);
    const max = liste.length > 0 ? liste[0].total : 1;
    return liste.map((m) => ({ ...m, pourcentage: Math.round((m.total / max) * 100) }));
  });

  ngOnInit(): void {
    this.rendezVousService.lister().subscribe({
      next: (data) => {
        this.rendezVous.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  choisirPeriode(valeur: Periode): void {
    this.periode.set(valeur);
  }

  // Un mois sans rendez-vous reste à plat ; les autres ont une hauteur minimale visible
  hauteurBarre(total: number): number {
    if (total === 0) return 0;
    return Math.max(Math.round((total / this.maxTendance()) * 100), 8);
  }

  exporterCsv(): void {
    const entetes = ['Numero', 'Date', 'Heure', 'Patient', 'Medecin', 'Service', 'Statut', 'Urgent'];
    const lignes = this.rdvPeriode().map((r) => [
      r.numero_rendez_vous,
      r.date_rendez_vous.substring(0, 10),
      r.heure_rendez_vous.substring(0, 5),
      `${r.patient.prenom} ${r.patient.nom}`,
      `Dr ${r.medecin.prenom} ${r.medecin.nom}`,
      r.service?.nom ?? '',
      this.libelleStatut(r.status),
      r.urgent ? 'Oui' : 'Non',
    ]);

    const csv = [entetes, ...lignes]
      .map((ligne) => ligne.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    // Le BOM (\ufeff) permet à Excel d'afficher correctement les accents
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `rapport-activite-${this.periode()}-mois.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  private libelleStatut(status: string): string {
    if (status === 'confirme') return 'Confirme';
    if (status === 'en_attente') return 'En attente';
    if (status === 'annule') return 'Annule';
    return status;
  }

  private dateRdv(r: RendezVousItem): Date {
    const [a, m, j] = r.date_rendez_vous.substring(0, 10).split('-').map(Number);
    return new Date(a, m - 1, j);
  }
}