import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { RendezVousService, RendezVousItem, AlertesReprogrammationResponse } from '../../core/rendez-vous.service';
import { MessageService, Conversation } from '../../core/message.service';
import { dateSeule, formatDateLong, heureCourte } from '../../core/format-date';

@Component({
  selector: 'app-secretaire-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './secretaire-layout.component.html',
  styleUrl: './secretaire-layout.component.css',
})
export class SecretaireLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('notificationRoot') private notificationRoot?: ElementRef<HTMLElement>;

  auth = inject(AuthService);
  private rendezVousService = inject(RendezVousService);
  private messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  menuOuvert = signal(false);
  sidebarReduite = signal(false);
  notificationsOuvert = signal(false);
  rendezVous = signal<RendezVousItem[]>([]);
  conversations = signal<Conversation[]>([]);
  alertesReprogrammation = signal<AlertesReprogrammationResponse>({ total: 0, rendez_vous: [] });

  readonly alertesAffichees = computed(() => this.alertesReprogrammation().rendez_vous.slice(0, 5));
  readonly notifSupplementaires = computed(() => Math.max(this.alertesReprogrammation().total - 5, 0));

  nombreNotifications = computed(() =>
    this.rendezVous().filter((r) => r.status === 'en_attente').length + this.alertesReprogrammation().total
  );

  nombreMessagesNonLus = computed(() =>
    this.conversations().reduce((total, c) => total + c.non_lus, 0)
  );

  ngOnInit(): void {
    this.chargerAlertesReprogrammation();
    this.rendezVousService.lister().subscribe({
      next: (data) => this.rendezVous.set(data),
    });
    this.messageService.conversations().subscribe({
      next: (data) => this.conversations.set(data),
    });

    timer(0, 60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.chargerAlertesReprogrammation());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.notificationsOuvert()) return;
    const target = event.target as Node;
    if (this.notificationRoot && this.notificationRoot.nativeElement.contains(target)) {
      return;
    }
    this.notificationsOuvert.set(false);
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (!this.notificationsOuvert()) {
      return;
    }

    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    this.notificationsOuvert.set(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private chargerAlertesReprogrammation(): void {
    this.rendezVousService.alertesReprogrammation()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.alertesReprogrammation.set(data),
        error: () => this.alertesReprogrammation.set({ total: 0, rendez_vous: [] }),
      });
  }

  logout(): void {
    this.auth.logout();
  }

  toggleMenu(): void {
    this.menuOuvert.update((v) => !v);
  }

  toggleNotifications(): void {
    this.notificationsOuvert.update((value) => !value);
  }

  fermerNotifications(): void {
    this.notificationsOuvert.set(false);
  }

  // Un créneau bloqué : seule cette heure est concernée.
  // Une journée désactivée : le planning du jour est inactif.
  causeAlerte(alerte: RendezVousItem): string {
    const creneau = (alerte as RendezVousItem & {
      creneau?: { status?: string; planning?: { status?: string } };
    }).creneau;

    return creneau?.planning?.status === 'inactif'
      ? 'Le médecin a désactivé sa journée'
      : 'Le médecin a bloqué ce créneau';
  }

  toggleSidebar(): void {
    this.sidebarReduite.update((v) => !v);
  }

  initiales(): string {
    const u = this.auth.currentUser();
    if (!u) return '';
    return `${u.prenom.charAt(0)}${u.nom.charAt(0)}`;
  }

  dateSeule(valeur: string | null | undefined): string {
    return dateSeule(valeur);
  }

  formatDateLong(dateStr: string): string {
    return formatDateLong(dateStr);
  }

  heureCourte(heure: string): string {
    return heureCourte(heure);
  }

  nomComplet(): string {
    const u = this.auth.currentUser();
    return u ? `${u.prenom} ${u.nom}` : '';
  }
}