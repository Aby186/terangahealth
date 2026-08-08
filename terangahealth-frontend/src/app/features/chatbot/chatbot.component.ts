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

  messages = signal<MessageChat[]>([
    {
      auteur: 'bot',
      texte: "Bonjour ! Décrivez-moi vos symptômes et je vous orienterai vers le bon service. Ceci ne remplace pas un avis médical.",
    },
  ]);

  toggleOuvert(): void {
    this.ouvert.update((v) => !v);
  }

  envoyer(): void {
    const texte = this.saisie().trim();
    if (!texte || this.enCours()) return;

    this.messages.update((liste) => [...liste, { auteur: 'patient', texte }]);
    this.saisie.set('');
    this.enCours.set(true);

    this.chatbotService.orienter(texte).subscribe({
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