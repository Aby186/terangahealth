import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatbotService, ServiceRecommande } from '../../core/chatbot.service';

interface MessageChat {
  auteur: 'patient' | 'bot';
  texte: string;
  services?: ServiceRecommande[];
}

interface HistoriqueChatMessage {
  role: 'patient' | 'assistant';
  texte: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css',
})
export class ChatbotComponent {
  private chatbotService = inject(ChatbotService);
  private router = inject(Router);

  ouvert = signal(false);
  saisie = signal('');
  enCours = signal(false);

  messages = signal<MessageChat[]>([]);

  toggleOuvert(): void {
    this.ouvert.update((v) => !v);
  }

  envoyer(): void {
    const texte = this.saisie().trim();
    if (!texte || this.enCours()) return;

    const historique: HistoriqueChatMessage[] = this.messages()
      .filter((message) => message.texte !== "Une erreur est survenue, réessayez dans un instant.")
      .slice(-6)
      .map((message) => ({
        role: message.auteur === 'patient' ? 'patient' : 'assistant',
        texte: message.texte.slice(0, 500),
      }));

    this.messages.update((liste) => [...liste, { auteur: 'patient', texte }]);
    this.saisie.set('');
    this.enCours.set(true);

    this.chatbotService.orienter(texte, historique).subscribe({
      next: (res) => {
        this.messages.update((liste) => [
          ...liste,
          { auteur: 'bot', texte: res.reponse, services: res.services },
        ]);
        this.enCours.set(false);
      },
      error: () => {
        this.messages.update((liste) => [
          ...liste,
          { auteur: 'bot', texte: "Une erreur est survenue, réessayez dans un instant." },
        ]);
        this.enCours.set(false);
      },
    });
  }

  prendreRdv(service: ServiceRecommande): void {
    this.ouvert.set(false);
    if (service.premier_medecin_id) {
      this.router.navigate(['/prendre-rdv', service.premier_medecin_id]);
    } else {
      this.router.navigate(['/prendre-rdv']);
    }
  }
}