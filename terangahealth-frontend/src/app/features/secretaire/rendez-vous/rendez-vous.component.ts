import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { RendezVousService, RendezVousItem, AlertesReprogrammationResponse } from '../../../core/rendez-vous.service';
import { MessageService } from '../../../core/message.service';
import { MedecinsService, Creneau } from '../../../core/medecins.service';
import { dateSeule as dateSeuleFn, formatDateLong as formatDateLongFn, heureCourte as heureCourteFn } from '../../../core/format-date';

@Component({
  selector: 'app-secretaire-rendez-vous',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rendez-vous.component.html',
  styleUrl: './rendez-vous.component.css',
})
export class SecretaireRendezVousComponent implements OnInit {
  @ViewChild('reprogDialog') private reprogDialog?: ElementRef<HTMLDialogElement>;

  private rendezVousService = inject(RendezVousService);
  private medecinsService = inject(MedecinsService);
  private messageService = inject(MessageService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly modalEffect = effect(() => {
    const dialog = this.reprogDialog?.nativeElement;
    const rdv = this.modalRdv();

    if (!dialog) {
      return;
    }

    if (rdv && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!rdv && dialog.open) {
      dialog.close();
    }
  });

  tousLesRendezVous = signal<RendezVousItem[]>([]);
  alertesReprogrammation = signal<AlertesReprogrammationResponse>({ total: 0, rendez_vous: [] });
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  traitementEnCoursId = signal<number | null>(null);
  listeOuverte = signal(false);

  modalRdv = signal<RendezVousItem | null>(null);
  creneauxDisponibles = signal<Creneau[]>([]);
  creneauSelectionneId = signal<number | null>(null);
  loadingCreneaux = signal(false);
  modalErreur = signal<string | null>(null);
  modalEnCours = signal(false);

  filtreStatut = signal('tous');
  filtreDate = signal('');
  filtreRecherche = signal('');

  totalCount = computed(() => this.tousLesRendezVous().length);
  enAttenteCount = computed(() => this.tousLesRendezVous().filter((r) => r.status === 'en_attente').length);
  confirmeCount = computed(() => this.tousLesRendezVous().filter((r) => r.status === 'confirme').length);
  annuleCount = computed(() => this.tousLesRendezVous().filter((r) => r.status === 'annule').length);
  reprogrammationCount = computed(() => this.alertesReprogrammation().total);

  rendezVousFiltres = computed(() => {
    const statut = this.filtreStatut();
    const date = this.filtreDate();
    const recherche = this.filtreRecherche().trim();

    const liste = this.tousLesRendezVous().filter((rdv) => {
      const matchStatut =
        statut === 'tous' ||
        (statut === 'reprogrammation' ? this.estAReprogrammer(rdv.id) : rdv.status === statut);
      const matchDate = !date || this.dateSeule(rdv.date_rendez_vous) === date;

      if (!matchStatut || !matchDate) return false;

      if (!recherche) return true;

      const qText = this.normalizeText(recherche);
      const qPhone = recherche.replace(/[+\s-]/g, '');

      const patientName = `${rdv.patient?.prenom ?? ''} ${rdv.patient?.nom ?? ''}`;
      const patientTel = rdv.patient?.telephone ?? '';
      const medecinName = this.nomMedecin(rdv);
      const numero = rdv.numero_rendez_vous ?? '';
      const service = rdv.service?.nom ?? '';

      const matchesText =
        this.normalizeText(patientName).includes(qText) ||
        this.normalizeText(medecinName).includes(qText) ||
        this.normalizeText(numero).includes(qText) ||
        this.normalizeText(service).includes(qText);

      const matchesPhone = this.normalizePhone(patientTel).includes(qPhone);

      return matchesText || matchesPhone;
    });

    // À reprogrammer : le rendez-vous le plus proche d'abord (date, puis heure).
    if (this.filtreStatut() === 'reprogrammation') {
      return [...liste].sort(
        (a, b) =>
          this.dateSeule(a.date_rendez_vous).localeCompare(this.dateSeule(b.date_rendez_vous)) ||
          a.heure_rendez_vous.localeCompare(b.heure_rendez_vous),
      );
    }

    return liste;
  });

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (!this.modalRdv()) return;
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    this.fermerReprogrammation();
  }

  ngOnInit(): void {
    const filtre = this.route.snapshot.queryParamMap.get('filtre');
    if (filtre === 'reprogrammation') {
      this.filtreStatut.set('reprogrammation');
    }
    this.charger();
    this.chargerAlertes();
  }

  charger(): void {
    this.loading.set(true);
    this.rendezVousService.lister().subscribe({
      next: (data) => {
        this.tousLesRendezVous.set(data);
        this.loading.set(false);

        const reprogrammerId = this.route.snapshot.queryParamMap.get('reprogrammer');
        if (!reprogrammerId) {
          return;
        }

        const rendezVousId = Number(reprogrammerId);
        const rendezVous = this.tousLesRendezVous().find((rdv) => rdv.id === rendezVousId);

        if (!rendezVous) {
          this.errorMessage.set('Ce rendez-vous n\'est plus à reprogrammer.');
          this.router.navigate([], { queryParams: { reprogrammer: null }, queryParamsHandling: 'merge' });
          return;
        }

        this.ouvrirReprogrammation(rendezVous);
        this.router.navigate([], { queryParams: { reprogrammer: null }, queryParamsHandling: 'merge' });
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les rendez-vous.');
        this.loading.set(false);
      },
    });
  }

  chargerAlertes(): void {
    this.rendezVousService.alertesReprogrammation().subscribe({
      next: (data) => {
        console.log('alertes', data);
        this.alertesReprogrammation.set(data);
      },
      error: () => this.alertesReprogrammation.set({ total: 0, rendez_vous: [] }),
    });
  }

  toggleListe(): void {
    this.listeOuverte.update((v) => !v);
  }

  effacerFiltres(): void {
    this.filtreStatut.set('tous');
    this.filtreDate.set('');
    this.filtreRecherche.set('');
  }

  confirmer(id: number): void {
    this.traitementEnCoursId.set(id);
    this.rendezVousService.confirmer(id).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.charger();
      },
      error: () => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set('Impossible de confirmer ce rendez-vous.');
      },
    });
  }

  annuler(id: number): void {
    if (!confirm('Confirmer l\'annulation de ce rendez-vous ?')) return;

    this.traitementEnCoursId.set(id);
    this.rendezVousService.annuler(id).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.charger();
      },
      error: () => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set('Impossible d\'annuler ce rendez-vous.');
      },
    });
  }

  ouvrirReprogrammation(rdv: RendezVousItem): void {
    console.log('Bouton Reprogrammer cliqué', rdv);
    this.modalRdv.set(rdv);
    this.modalErreur.set(null);
    this.creneauSelectionneId.set(null);
    this.creneauxDisponibles.set([]);
    this.loadingCreneaux.set(true);
    this.chargerCreneauxDuMedecin(rdv);
  }

  rechargerCreneaux(): void {
    const rdv = this.modalRdv();
    if (!rdv) return;
    this.modalErreur.set(null);
    this.loadingCreneaux.set(true);
    this.creneauxDisponibles.set([]);
    this.chargerCreneauxDuMedecin(rdv);
  }

  private chargerCreneauxDuMedecin(rdv: RendezVousItem): void {
    this.medecinsService.getCreneaux(rdv.medecin_id).subscribe({
      next: (data) => {
        const aujourdHui = new Date();
        const dateAujourdhui = this.dateSeule(aujourdHui.toISOString());

        const creneauxFiltres = data.filter((creneau) => {
          const dateCreneau = this.dateSeule(creneau.planning.date_planning);
          return (
            creneau.status === 'disponible' &&
            dateCreneau >= dateAujourdhui &&
            !(this.dateSeule(creneau.planning.date_planning) === this.dateSeule(rdv.date_rendez_vous) && creneau.heure_debut === rdv.heure_rendez_vous)
          );
        });

        this.creneauxDisponibles.set(creneauxFiltres.sort((a, b) => this.dateSeule(a.planning.date_planning).localeCompare(this.dateSeule(b.planning.date_planning)) || a.heure_debut.localeCompare(b.heure_debut)));
        this.loadingCreneaux.set(false);
      },
      error: (err) => {
        console.error('Erreur chargement créneaux pour reprogrammation', err);
        this.loadingCreneaux.set(false);
        this.creneauxDisponibles.set([]);
        this.modalErreur.set('Impossible de charger les disponibilités. Réessayez.');
      },
    });
  }

  fermerReprogrammation(): void {
    this.modalRdv.set(null);
    this.modalErreur.set(null);
    this.loadingCreneaux.set(false);
    this.creneauxDisponibles.set([]);
    this.creneauSelectionneId.set(null);
    this.modalEnCours.set(false);
  }

  groupesCreneauxDisponibles() {
    const groupes = new Map<string, Creneau[]>();

    for (const creneau of this.creneauxDisponibles()) {
      const date = creneau.planning.date_planning;
      const items = groupes.get(date) ?? [];
      items.push(creneau);
      groupes.set(date, items);
    }

    return Array.from(groupes.entries()).map(([date, creneaux]) => ({
      date,
      label: this.formatDateLong(date),
      creneaux: creneaux.sort((a, b) => a.heure_debut.localeCompare(b.heure_debut)),
    }));
  }

  confirmerReprogrammation(): void {
    const rdv = this.modalRdv();
    const creneauId = this.creneauSelectionneId();
    if (!rdv || !creneauId) return;

    const ancienneDate = this.dateSeule(rdv.date_rendez_vous) || rdv.date_rendez_vous;
    const ancienneHeure = rdv.heure_rendez_vous;

    this.modalEnCours.set(true);
    this.modalErreur.set(null);

    this.rendezVousService.reprogrammer(rdv.id, creneauId).subscribe({
      next: () => {
        const nouveauCreneau = this.creneauxDisponibles().find((creneau) => creneau.id === creneauId);
        const nouvelleDate = nouveauCreneau?.planning.date_planning ?? rdv.date_rendez_vous;
        const nouvelleHeure = nouveauCreneau?.heure_debut ?? rdv.heure_rendez_vous;
        const messageSucces = `Rendez-vous reprogrammé au ${this.formatDateLong(nouvelleDate)} à ${this.heureCourte(nouvelleHeure)}`;

        this.modalEnCours.set(false);
        this.fermerReprogrammation();
        this.successMessage.set(messageSucces);
        this.charger();
        this.chargerAlertes();

        this.envoyerMessagePatient(rdv, nouvelleDate, nouvelleHeure);
        this.rendezVousService.notifierReprogrammation(rdv.id, ancienneDate, ancienneHeure).subscribe({
          next: (response) => {
            const messageAvecNotification = this.messageNotificationReprogrammation(messageSucces, response);
            this.successMessage.set(messageAvecNotification);
          },
          error: () => {
            this.successMessage.set(messageSucces);
          },
        });
      },
      error: (err) => {
        this.modalEnCours.set(false);
        this.modalErreur.set(err.error?.message ?? 'Impossible de reprogrammer ce rendez-vous.');
      },
    });
  }

  private messageNotificationReprogrammation(messageSucces: string, response: { email_envoye: boolean; patient_a_email: boolean }): string {
    if (response.email_envoye) {
      return `${messageSucces}.\nPatient prévenu par messagerie et par e-mail.`;
    }

    if (response.patient_a_email) {
      return `${messageSucces}.\nPatient prévenu par messagerie. L'e-mail n'a pas pu être envoyé.`;
    }

    return `${messageSucces}.\nPatient prévenu par messagerie. Ce patient n'a pas d'adresse e-mail.`;
  }

  private envoyerMessagePatient(rdv: RendezVousItem, nouvelleDate: string, nouvelleHeure: string): void {
    const secretaire = this.auth.currentUser();
    const patient = rdv.patient;

    if (!secretaire || !patient) {
      return;
    }

    const contenu = `Bonjour ${patient.prenom}, votre rendez-vous du ${this.formatDateLong(rdv.date_rendez_vous)} à ${this.heureCourte(rdv.heure_rendez_vous)} avec le Dr ${rdv.medecin.prenom} ${rdv.medecin.nom} a dû être déplacé. Il est maintenant fixé au ${this.formatDateLong(nouvelleDate)} à ${this.heureCourte(nouvelleHeure)}. Si ce créneau ne vous convient pas, vous pouvez le modifier depuis « Mes rendez-vous » ou nous écrire ici.`;

    this.messageService.envoyer(patient.id, contenu).subscribe();
  }

  supprimer(id: number): void {
    if (!confirm('Supprimer définitivement ce rendez-vous ?')) return;

    this.traitementEnCoursId.set(id);
    this.rendezVousService.supprimer(id).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.charger();
      },
      error: () => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set('Impossible de supprimer ce rendez-vous.');
      },
    });
  }

  estAReprogrammer(rdvId: number): boolean {
    return this.alertesReprogrammation().rendez_vous.some((rdv) => rdv.id === rdvId);
  }

  peutReprogrammer(status: string): boolean {
    return status === 'en_attente' || status === 'confirme';
  }

  nomMedecin(rdv: RendezVousItem): string {
    return `Dr ${rdv.medecin.prenom} ${rdv.medecin.nom}`;
  }

  dateSeule(valeur: string | null | undefined): string {
    return dateSeuleFn(valeur);
  }

  private normalizeText(val: string | null | undefined): string {
    if (!val) return '';
    return val
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  }

  private normalizePhone(val: string | null | undefined): string {
    if (!val) return '';
    return val.replace(/[+\s-]/g, '');
  }

  formatDateLong(dateStr: string): string {
    return formatDateLongFn(dateStr);
  }

  heureCourte(heure: string): string {
    return heureCourteFn(heure);
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      en_attente: 'En attente',
      confirme: 'Confirmé',
      annule: 'Annulé',
    };
    return labels[status] ?? status;
  }

  formatDate(dateStr: string): string {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const normalized = this.dateSeule(dateStr) || dateStr;
    const date = new Date(normalized);
    return `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]}`;
  }
}