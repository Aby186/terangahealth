import { CommonModule } from '@angular/common';
import { Component, OnDestroy, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AssistantVocalService, CreneauPropose, ReponseAssistant } from '../../core/assistant-vocal.service';
import { EnregistreurWav } from '../../core/enregistreur-wav';

type PhaseAssistant = 'accueil' | 'pret' | 'ecoute' | 'envoi' | 'erreur';

@Component({
  selector: 'app-assistant-vocal-flottant',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assistant-vocal-flottant.component.html',
  styleUrl: './assistant-vocal-flottant.component.css',
})
export class AssistantVocalFlottantComponent implements OnDestroy {
  private assistantVocalService = inject(AssistantVocalService);
  private router = inject(Router);
  private enregistreur = new EnregistreurWav();
  private audioEnCours: HTMLAudioElement | null = null;
  private timeoutPaiement: number | null = null;
  private paiementRedirectionActive = false;

  ouvert = signal(false);
  phase = signal<PhaseAssistant>('accueil');
  messageErreur = signal('');
  comprisFr = signal<string | null>(null);
  reponseWo = signal('');
  reponseFr = signal('');
  creneaux = signal<CreneauPropose[]>([]);
  urlPaiement = signal<string | null>(null);
  dernierAudioBase64 = signal<string | null>(null);

  ngOnDestroy(): void {
    this.enregistreur.annuler();
    this.audioEnCours?.pause();
    this.audioEnCours = null;
    this.clearTimeoutPaiement();
  }

  toggleOuvert(): void {
    this.ouvert.update((value) => !value);
    if (!this.ouvert()) {
      this.enregistreur.annuler();
      this.audioEnCours?.pause();
      this.audioEnCours = null;
      this.clearTimeoutPaiement();
    }
  }

  demarrer(): void {
    this.messageErreur.set('');
    this.phase.set('envoi');

    this.assistantVocalService.converser('debut').subscribe({
      next: (reponse) => {
        this.appliquerReponse(reponse);
        this.phase.set('pret');
      },
      error: () => {
        this.phase.set('erreur');
        this.messageErreur.set('Un problème est survenu, réessaie');
      },
    });
  }

  demarrerEnregistrement(): void {
    if (this.urlPaiement()) {
      return;
    }

    this.messageErreur.set('');
    this.enregistreur.demarrer(() => {
      void this.terminerEnregistrement();
    }, 25).then(() => {
      this.phase.set('ecoute');
    }).catch(() => {
      this.phase.set('erreur');
      this.messageErreur.set('Autorise le micro dans ton navigateur');
    });
  }

  async terminerEnregistrement(): Promise<void> {
    if (this.urlPaiement() || this.phase() !== 'ecoute') {
      return;
    }

    try {
      const blob = await this.enregistreur.arreter();

      if (blob.size < 32000) {
        this.phase.set('pret');
        this.messageErreur.set('Trop court, réessaie');
        return;
      }

      this.phase.set('envoi');
      const reponse = await firstValueFrom(this.assistantVocalService.converser('specialite', blob));
      this.appliquerReponse(reponse);
      this.phase.set('pret');
    } catch {
      this.phase.set('erreur');
      this.messageErreur.set('Un problème est survenu, réessaie');
    }
  }

  boutonMicroAction(): void {
    if (this.urlPaiement()) {
      return;
    }

    if (this.phase() === 'pret') {
      this.demarrerEnregistrement();
      return;
    }

    if (this.phase() === 'ecoute') {
      void this.terminerEnregistrement();
    }
  }

  private appliquerReponse(reponse: ReponseAssistant): void {
    this.comprisFr.set(reponse.compris_fr ?? null);
    this.reponseWo.set(reponse.reponse_wo ?? '');
    this.reponseFr.set(reponse.reponse_fr ?? '');
    this.creneaux.set(reponse.creneaux ?? []);
    this.dernierAudioBase64.set(reponse.audio_base64 ?? null);
    this.urlPaiement.set(reponse.url_paiement ?? null);

    if (reponse.url_paiement) {
      this.demarrerRedirectionPaiement(reponse.url_paiement);
    }

    if (reponse.audio_base64) {
      this.lireAudio(reponse.audio_base64);
    }
  }

  reecouter(): void {
    if (this.dernierAudioBase64()) {
      this.lireAudio(this.dernierAudioBase64()!);
    }
  }

  private lireAudio(base64: string): void {
    this.audioEnCours?.pause();
    const audio = new Audio(`data:audio/wav;base64,${base64}`);
    this.audioEnCours = audio;

    audio.play().catch(() => {
      this.audioEnCours = null;
      if (this.urlPaiement()) {
        window.setTimeout(() => this.ouvrirPaiement(this.urlPaiement()), 3000);
      }
    });

    if (this.urlPaiement()) {
      this.demarrerRedirectionPaiement(this.urlPaiement());
    }
  }

  demarrerRedirectionPaiement(url: string | null): void {
    const target = url?.trim();
    if (!target) {
      return;
    }

    this.urlPaiement.set(target);
    if (this.paiementRedirectionActive) {
      return;
    }

    this.paiementRedirectionActive = true;
    this.clearTimeoutPaiement();

    const redirigerVersPaiement = () => {
      if (this.paiementRedirectionActive) {
        this.paiementRedirectionActive = false;
      }
      this.ouvrirPaiement(target);
    };

    this.timeoutPaiement = window.setTimeout(redirigerVersPaiement, 15000);

    if (this.audioEnCours) {
      this.audioEnCours.addEventListener('ended', redirigerVersPaiement, { once: true });
      this.audioEnCours.addEventListener('error', redirigerVersPaiement, { once: true });
    }
  }

  ouvrirPaiement(url: string | null): void {
    const target = url?.trim();
    if (!target) {
      return;
    }

    this.clearTimeoutPaiement();
    this.paiementRedirectionActive = false;
    this.urlPaiement.set(target);
    window.location.href = target;
  }

  private clearTimeoutPaiement(): void {
    if (this.timeoutPaiement !== null) {
      window.clearTimeout(this.timeoutPaiement);
      this.timeoutPaiement = null;
    }
  }

  ouvrirCreneau(creneau: CreneauPropose): void {
    this.router.navigate(['/prendre-rdv', creneau.medecin_id]);
  }
}
