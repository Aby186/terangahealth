import { Component, signal, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth.service';
import { PlanningService, PlanningItem } from '../../../core/planning.service';

interface RendezVousAgenda {
  id: number;
  date: string;      // AAAA-MM-JJ
  heure: string;     // HH:MM
  debut: Date;
  fin: Date;
  patientNom: string;
  motif: string;
  urgent: boolean;
  status: string;
  numero: string;
}

interface GroupeJour {
  date: string;
  titre: string;
  sousTitre: string;
  items: RendezVousAgenda[];
}

type FiltrePeriode = 'tous' | 'aujourdhui' | 'semaine';

@Component({
  selector: 'app-medecin-planning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './planning.component.html',
  styleUrl: './planning.component.css',
})
export class MedecinPlanningComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private planningService = inject(PlanningService);

  plannings = signal<PlanningItem[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  filtre = signal<FiltrePeriode>('tous');

  // Mis à jour chaque minute pour que le décompte reste juste.
  maintenant = signal<Date>(new Date());
  private minuteur?: ReturnType<typeof setInterval>;

  // ---------- Données ----------
  /** Tous les rendez-vous à venir (ou en cours), triés par date et heure. */
  tousLesRendezVous = computed<RendezVousAgenda[]>(() => {
    const maintenant = this.maintenant();
    const liste: RendezVousAgenda[] = [];

    for (const planning of this.plannings()) {
      if (String(planning.status) === 'inactif') continue;

      const dateStr = String(planning.date_planning).substring(0, 10);

      for (const creneau of planning.creneaux ?? []) {
        if (this.normalizeStatus(creneau.status) !== 'reserve') continue;

        const brut = (creneau as any).rendezVous ?? (creneau as any).rendez_vous;
        const rdv = Array.isArray(brut) ? brut.find((r: any) => r?.status !== 'annule') : brut;
        if (!rdv || rdv.status === 'annule') continue;

        const heure = this.heureCourte(String(creneau.heure_debut));
        const debut = this.construireDate(dateStr, heure);
        const heureFin = (creneau as any).heure_fin;
        const fin = heureFin
          ? this.construireDate(dateStr, this.heureCourte(String(heureFin)))
          : new Date(debut.getTime() + 30 * 60000);

        if (fin.getTime() < maintenant.getTime()) continue;

        liste.push({
          id: rdv.id ?? creneau.id,
          date: dateStr,
          heure,
          debut,
          fin,
          patientNom: rdv.patient ? `${rdv.patient.prenom} ${rdv.patient.nom}` : 'Patient',
          motif: rdv.motif ?? '',
          urgent: !!rdv.urgent,
          status: String(rdv.status ?? ''),
          numero: rdv.numero_rendez_vous ?? '',
        });
      }
    }

    return liste.sort((a, b) => a.debut.getTime() - b.debut.getTime());
  });

  prochain = computed<RendezVousAgenda | null>(() => this.tousLesRendezVous()[0] ?? null);

  listeFiltree = computed<RendezVousAgenda[]>(() => {
    const tous = this.tousLesRendezVous();
    const maintenant = this.maintenant();

    if (this.filtre() === 'aujourdhui') {
      const aujourdhui = this.jourStr(maintenant);
      return tous.filter((r) => r.date === aujourdhui);
    }

    if (this.filtre() === 'semaine') {
      const finSemaine = new Date(maintenant);
      finSemaine.setDate(finSemaine.getDate() + ((7 - finSemaine.getDay()) % 7));
      finSemaine.setHours(23, 59, 59, 999);
      return tous.filter((r) => r.debut.getTime() <= finSemaine.getTime());
    }

    return tous;
  });

  groupes = computed<GroupeJour[]>(() => {
    const resultat: GroupeJour[] = [];

    for (const rdv of this.listeFiltree()) {
      let groupe = resultat.find((g) => g.date === rdv.date);
      if (!groupe) {
        groupe = {
          date: rdv.date,
          titre: this.titreJour(rdv.date),
          sousTitre: this.sousTitreJour(rdv.date),
          items: [],
        };
        resultat.push(groupe);
      }
      groupe.items.push(rdv);
    }

    return resultat;
  });

  // ---------- Cycle de vie ----------
  ngOnInit(): void {
    this.charger();
    this.minuteur = setInterval(() => this.maintenant.set(new Date()), 60000);
  }

  ngOnDestroy(): void {
    if (this.minuteur) clearInterval(this.minuteur);
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

  changerFiltre(filtre: FiltrePeriode): void {
    this.filtre.set(filtre);
  }

  // ---------- Libellés ----------
  titreJour(dateStr: string): string {
    const aujourdhui = this.jourStr(new Date());
    const demain = new Date();
    demain.setDate(demain.getDate() + 1);

    if (dateStr === aujourdhui) return "Aujourd'hui";
    if (dateStr === this.jourStr(demain)) return 'Demain';
    return this.dateLongue(dateStr);
  }

  sousTitreJour(dateStr: string): string {
    const titre = this.titreJour(dateStr);
    return titre === "Aujourd'hui" || titre === 'Demain' ? this.dateLongue(dateStr) : '';
  }

  compteARebours(rdv: RendezVousAgenda): string {
    const maintenant = this.maintenant();

    if (maintenant.getTime() >= rdv.debut.getTime()) return 'En cours';

    const minutes = Math.round((rdv.debut.getTime() - maintenant.getTime()) / 60000);
    if (minutes < 60) return `dans ${Math.max(minutes, 1)} min`;

    const aujourdhui = this.jourStr(maintenant);
    if (rdv.date === aujourdhui) {
      const heures = Math.floor(minutes / 60);
      const reste = minutes % 60;
      return reste > 0 ? `dans ${heures} h ${String(reste).padStart(2, '0')}` : `dans ${heures} h`;
    }

    const debutJourRdv = new Date(rdv.debut.getFullYear(), rdv.debut.getMonth(), rdv.debut.getDate()).getTime();
    const debutJourActuel = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()).getTime();
    const jours = Math.round((debutJourRdv - debutJourActuel) / 86400000);

    return jours === 1 ? `demain à ${rdv.heure}` : `dans ${jours} jours`;
  }

  libelleStatut(status: string): string {
    if (status === 'confirme') return 'Confirmé';
    if (status === 'en_attente') return 'En attente';
    return status;
  }

  // ---------- Outils de date ----------
  private dateLongue(dateStr: string): string {
    const [annee, mois, jour] = dateStr.split('-').map(Number);
    return new Date(annee, mois - 1, jour).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  private jourStr(date: Date): string {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  }

  private heureCourte(heure: string): string {
    const brut = heure.includes('T') ? heure.split('T')[1] : heure;
    return brut.substring(0, 5);
  }

  private construireDate(dateStr: string, heure: string): Date {
    const [annee, mois, jour] = dateStr.split('-').map(Number);
    const [h, m] = heure.split(':').map(Number);
    return new Date(annee, mois - 1, jour, h, m, 0, 0);
  }

  private normalizeStatus(status: unknown): string {
    const raw = String(status ?? '').toLowerCase();
    if (raw.includes('reserve')) return 'reserve';
    if (raw.includes('dispon')) return 'disponible';
    if (raw.includes('annul')) return 'annule';
    return raw;
  }

  // ---------- Exporter / Imprimer ----------
  imprimer(): void {
    window.print();
  }

  exporter(): void {
    const nettoyer = (texte: string) => texte.replace(/[;\r\n]+/g, ' ').trim();
    const lignes = ['Date;Heure;Patient;Motif;Statut'];

    for (const rdv of this.listeFiltree()) {
      const date = new Date(rdv.debut).toLocaleDateString('fr-FR');
      lignes.push(
        `${date};${rdv.heure};${nettoyer(rdv.patientNom)};${nettoyer(rdv.motif)};${this.libelleStatut(rdv.status)}`
      );
    }

    const blob = new Blob(['\uFEFF' + lignes.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'mes-rendez-vous.csv';
    lien.click();
    URL.revokeObjectURL(url);
  }
}