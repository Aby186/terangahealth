import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, MessageItem, Contact, Conversation } from '../../core/message.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-messagerie',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messagerie.component.html',
  styleUrl: './messagerie.component.css',
})
export class MessagerieComponent implements OnInit {
  private messageService = inject(MessageService);
  private auth = inject(AuthService);

  conversations = signal<Conversation[]>([]);
  contacts = signal<Contact[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  contactActifId = signal<number | null>(null);
  messages = signal<MessageItem[]>([]);
  loadingMessages = signal(false);
  nouveauMessage = signal('');
  envoiEnCours = signal(false);

  nouveauContactOuvert = signal(false);

  messageEnEditionId = signal<number | null>(null);
  texteEdition = signal('');

  contactActif = computed(() => {
    const id = this.contactActifId();
    return this.contacts().find((c) => c.id === id) ?? null;
  });

  ngOnInit(): void {
    this.chargerConversations();
    this.messageService.contacts().subscribe({
      next: (data) => this.contacts.set(data),
    });
  }

  chargerConversations(): void {
    this.loading.set(true);
    this.messageService.conversations().subscribe({
      next: (data) => {
        this.conversations.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger vos conversations.');
        this.loading.set(false);
      },
    });
  }

  ouvrirConversation(contactId: number): void {
    this.contactActifId.set(contactId);
    this.nouveauContactOuvert.set(false);
    this.chargerMessages(contactId);
  }

  chargerMessages(contactId: number): void {
    this.loadingMessages.set(true);
    this.messageService.lister(contactId).subscribe({
      next: (data) => {
        this.messages.set(data);
        this.loadingMessages.set(false);

        const userId = this.auth.currentUser()?.id;
        data
          .filter((m) => m.destinataire_id === userId && !m.lu)
          .forEach((m) => this.messageService.marquerLu(m.id).subscribe());
      },
      error: () => {
        this.loadingMessages.set(false);
      },
    });
  }

  envoyer(): void {
    const contenu = this.nouveauMessage().trim();
    const destinataireId = this.contactActifId();
    if (!contenu || !destinataireId) return;

    this.envoiEnCours.set(true);

    this.messageService.envoyer(destinataireId, contenu).subscribe({
      next: () => {
        this.envoiEnCours.set(false);
        this.nouveauMessage.set('');
        this.chargerMessages(destinataireId);
        this.chargerConversations();
      },
      error: () => {
        this.envoiEnCours.set(false);
        this.errorMessage.set('Impossible d\'envoyer ce message.');
      },
    });
  }

  supprimer(messageId: number): void {
    if (!confirm('Supprimer définitivement ce message ?')) return;

    this.messageService.supprimer(messageId).subscribe({
      next: () => {
        const contactId = this.contactActifId();
        if (contactId) this.chargerMessages(contactId);
      },
      error: () => {
        this.errorMessage.set('Impossible de supprimer ce message.');
      },
    });
  }

  ouvrirEdition(m: MessageItem): void {
    this.messageEnEditionId.set(m.id);
    this.texteEdition.set(m.contenu);
  }

  annulerEdition(): void {
    this.messageEnEditionId.set(null);
  }

  validerEdition(messageId: number): void {
    const texte = this.texteEdition().trim();
    if (!texte) return;

    this.messageService.modifier(messageId, texte).subscribe({
      next: () => {
        this.messageEnEditionId.set(null);
        const contactId = this.contactActifId();
        if (contactId) this.chargerMessages(contactId);
      },
      error: () => {
        this.errorMessage.set('Impossible de modifier ce message.');
      },
    });
  }

  supprimerConversation(): void {
    const contactId = this.contactActifId();
    if (!contactId) return;
    if (!confirm('Supprimer définitivement toute cette conversation ?')) return;

    this.messageService.supprimerConversation(contactId).subscribe({
      next: () => {
        this.contactActifId.set(null);
        this.messages.set([]);
        this.chargerConversations();
      },
      error: () => {
        this.errorMessage.set('Impossible de supprimer cette conversation.');
      },
    });
  }

  ouvrirNouveauContact(): void {
    this.nouveauContactOuvert.set(true);
    this.contactActifId.set(null);
  }

  contactsSansConversation(): Contact[] {
    const idsExistants = new Set(this.conversations().map((c) => c.utilisateur.id));
    return this.contacts().filter((c) => !idsExistants.has(c.id));
  }

  estMoi(message: MessageItem): boolean {
    return message.expediteur_id === this.auth.currentUser()?.id;
  }

  nomComplet(u: { prenom: string; nom: string }): string {
    return `${u.prenom} ${u.nom}`;
  }

  initiales(u: { prenom: string; nom: string }): string {
    return `${u.prenom.charAt(0)}${u.nom.charAt(0)}`;
  }

  formatHeure(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}