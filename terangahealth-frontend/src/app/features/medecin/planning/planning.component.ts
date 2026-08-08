import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { PlanningService, PlanningItem } from '../../../core/planning.service';

interface CelluleCalendrier {
  creneauId: number | null;
  status: string | null;
  patientNom: string | null;
  motif: string | null;
}

interface ResumeJour {
  date: Date;
  horsMois: boolean;
  disponibles: number;
  reserves: number;
}

@Component({
  selector: 'app-medecin-planning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planning.component.html',
  styleUrl: './planning.component.css',
})
export class MedecinPlanningComponent implements OnInit {
  private auth = inject(AuthService);
  private planningService = inject(PlanningService);

  plannings = signal<PlanningItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  vueMode = signal<'semaine' | 'mois'>('semaine');

  // ---------- Vue semaine ----------
  debutSemaine = signal<Date>(this.lundiDeLaSemaine(new Date()));
  jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  heures: string[] = (() => {
    const liste: string[] = [];
    for (let h = 8; h <= 18; h++) {
      liste.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 18) liste.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return liste;
  })();

  joursDeLaSemaine = computed(() => {
    const debut = this.debutSemaine();
    return this.jours.map((_, i) => {
      const d = new Date(debut);
      d.setDate(d.getDate() + i);
      return d;
    });
  });

  libelleSemaine = computed(() => {
    const jrs = this.joursDeLaSemaine();
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${fmt(jrs[0])} - ${fmt(jrs[jrs.length - 1])}`;
  });

  // ---------- Vue mois ----------
  moisActuel = signal<Date>(this.premierJourDuMois(new Date()));

  libelleMois = computed(() => {
    return this.moisActuel().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  });

  joursDuMois = computed<ResumeJour[]>(() => {
    const premierJour = this.moisActuel();
    const anneeMois = premierJour.getMonth();

    const premierLundi = this.lundiDeLaSemaine(premierJour);

    const dernierJourMois = new Date(premierJour.getFullYear(), premierJour.getMonth() + 1, 0);
    const dernierDimanche = new Date(dernierJourMois);
    const decalageFin = dernierDimanche.getDay() === 0 ? 0 : 7 - dernierDimanche.getDay();
    dernierDimanche.setDate(dernierDimanche.getDate() + decalageFin);

    const jours: ResumeJour[] = [];
    const curseur = new Date(premierLundi);

    while (curseur <= dernierDimanche) {
      const d = new Date(curseur);
      const resume = this.resumeDuJour(d);
      jours.push({
        date: d,
        horsMois: d.getMonth() !== anneeMois,
        disponibles: resume.disponibles,
        reserves: resume.reserves,
      });
      curseur.setDate(curseur.getDate() + 1);
    }

    return jours;
  });

  // ---------- Ajout rapide d'un créneau ----------
  ajoutOuvert = signal(false);
  ajoutDate = signal('');
  ajoutHeure = signal('09:00');
  ajoutDuree = signal(30);
  ajoutEnCours = signal(false);

  private lundiDeLaSemaine(date: Date): Date {
    const d = new Date(date);
    const jour = d.getDay();
    const decalage = jour === 0 ? -6 : 1 - jour;
    d.setDate(d.getDate() + decalage);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private premierJourDuMois(date: Date): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  ngOnInit(): void {
    this.charger();
  }

  private charger(): void {
    const medecinId = this.auth.currentUser()?.id;
    if (!medecinId) return;

    this.loading.set(true);
    this.planningService.getPlannings(medecinId).subscribe({
      next: (data) => {
        this.plannings.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger votre planning.');
        this.loading.set(false);
      },
    });
  }

  // ---------- Navigation ----------
  semainePrecedente(): void {
    const d = new Date(this.debutSemaine());
    d.setDate(d.getDate() - 7);
    this.debutSemaine.set(d);
  }

  semaineSuivante(): void {
    const d = new Date(this.debutSemaine());
    d.setDate(d.getDate() + 7);
    this.debutSemaine.set(d);
  }

  moisPrecedent(): void {
    const d = new Date(this.moisActuel());
    d.setMonth(d.getMonth() - 1);
    this.moisActuel.set(d);
  }

  moisSuivant(): void {
    const d = new Date(this.moisActuel());
    d.setMonth(d.getMonth() + 1);
    this.moisActuel.set(d);
  }

  aujourdhui(): void {
    this.debutSemaine.set(this.lundiDeLaSemaine(new Date()));
    this.moisActuel.set(this.premierJourDuMois(new Date()));
  }

  changerVue(mode: 'semaine' | 'mois'): void {
    this.vueMode.set(mode);
  }

  // ---------- Lecture des créneaux ----------
  cellule(jour: Date, heure: string): CelluleCalendrier {
    const dateStr = this.formatDateLocal(jour);
    const planning = this.plannings().find((p) => p.date_planning.substring(0, 10) === dateStr || p.date_planning === jour.toLocaleDateString('fr-CA'));

    if (!planning) {
      return { creneauId: null, status: null, patientNom: null, motif: null };
    }

    const creneau = planning.creneaux.find((c) => {
      const heureCreneau = c.heure_debut.includes('T') ? c.heure_debut.split('T')[1].substring(0, 5) : c.heure_debut.substring(0, 5);
      return heureCreneau === heure;
    });

    if (!creneau) {
      return { creneauId: null, status: null, patientNom: null, motif: null };
    }

    const rdv = (creneau as any).rendezVous ?? (creneau as any).rendez_vous;
    const status = this.normalizeStatus(creneau.status);

    return {
      creneauId: creneau.id,
      status,
      patientNom: rdv?.patient ? `${rdv.patient.prenom} ${rdv.patient.nom}` : null,
      motif: rdv?.motif ?? null,
    };
  }

  private resumeDuJour(jour: Date): { disponibles: number; reserves: number } {
    const dateStr = this.formatDateLocal(jour);
    const planning = this.plannings().find((p) => p.date_planning.substring(0, 10) === dateStr);

    if (!planning) return { disponibles: 0, reserves: 0 };

    return {
      disponibles: planning.creneaux.filter((c) => this.normalizeStatus(c.status) === 'disponible').length,
      reserves: planning.creneaux.filter((c) => this.normalizeStatus(c.status) === 'reserve').length,
    };
  }

  ouvrirJourDepuisMois(jour: Date): void {
    this.debutSemaine.set(this.lundiDeLaSemaine(jour));
    this.vueMode.set('semaine');
  }

  private normalizeStatus(status: unknown): string {
    const raw = String(status ?? '').toLowerCase();
    if (raw.includes('reserve')) return 'reserve';
    if (raw.includes('dispon')) return 'disponible';
    if (raw.includes('annul')) return 'annule';
    return raw;
  }

  // ---------- Ajouter un créneau ----------
  ouvrirAjout(): void {
    this.ajoutOuvert.set(true);
    this.ajoutDate.set('');
    this.ajoutHeure.set('09:00');
    this.ajoutDuree.set(30);
  }

  fermerAjout(): void {
    this.ajoutOuvert.set(false);
  }

  confirmerAjout(): void {
    const medecinId = this.auth.currentUser()?.id;
    const date = this.ajoutDate();
    if (!medecinId || !date) return;

    this.ajoutEnCours.set(true);
    this.errorMessage.set(null);

    this.planningService.creerPlanning(medecinId, date).subscribe({
      next: (res) => this.genererCreneauSurPlanning(res.planning.id),
      error: (err) => {
        if (err.status === 409) {
          const planningExistant = this.plannings().find((p) => p.date_planning.substring(0, 10) === date);
          if (planningExistant) {
            this.genererCreneauSurPlanning(planningExistant.id);
            return;
          }
        }
        this.ajoutEnCours.set(false);
        this.errorMessage.set('Impossible d\'ajouter ce créneau.');
      },
    });
  }

  private genererCreneauSurPlanning(planningId: number): void {
    const heureDebut = this.ajoutHeure();
    const [h, m] = heureDebut.split(':').map(Number);
    const totalMinutes = h * 60 + m + this.ajoutDuree();
    const heureFin = `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')}`;

    this.planningService.genererCreneaux(planningId, heureDebut, heureFin, this.ajoutDuree()).subscribe({
      next: () => {
        this.ajoutEnCours.set(false);
        this.ajoutOuvert.set(false);
        this.successMessage.set('Créneau ajouté.');
        this.charger();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: () => {
        this.ajoutEnCours.set(false);
        this.errorMessage.set('Impossible d\'ajouter ce créneau.');
      },
    });
  }

  // ---------- Exporter / Imprimer ----------
  imprimer(): void {
    window.print();
  }

  exporter(): void {
    const lignes = ['Jour;Date;Heure;Statut;Patient;Motif'];

    this.joursDeLaSemaine().forEach((jour, i) => {
      this.heures.forEach((heure) => {
        const c = this.cellule(jour, heure);
        if (c.status) {
          const dateStr = jour.toLocaleDateString('fr-FR');
          lignes.push(`${this.jours[i]};${dateStr};${heure};${c.status};${c.patientNom ?? ''};${c.motif ?? ''}`);
        }
      });
    });

    const contenu = lignes.join('\n');
    const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `planning-${this.libelleSemaine().replace(/\s/g, '')}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }
}