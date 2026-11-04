import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';

type ProfilForm = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  date_naissance: string;
  sexe: string;
};

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.css',
})
export class ProfilComponent {
  auth = inject(AuthService);

  // dialogue de suppression
  dialogueOuvert = signal(false);
  motDePasse = signal('');
  erreur = signal<string | null>(null);
  enCours = signal(false);

  modeEdition = signal(false);
  successMessage = signal<string | null>(null);
  erreurProfil = signal<string | null>(null);
  validationErrors = signal<Record<string, string[]>>({});
  form = signal<ProfilForm>({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    date_naissance: '',
    sexe: '',
  });

  constructor() {
    this.syncFormFromUser();
  }

  initiales(): string {
    const u = this.auth.currentUser();
    if (!u) return '';
    return `${u.prenom.charAt(0)}${u.nom.charAt(0)}`;
  }

  ouvrirDialogue(): void {
    this.erreur.set(null);
    this.motDePasse.set('');
    this.dialogueOuvert.set(true);
  }

  fermerDialogue(): void {
    if (this.enCours()) return;
    this.dialogueOuvert.set(false);
    this.erreur.set(null);
    this.motDePasse.set('');
  }

  saisirMotDePasse(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.motDePasse.set(v);
  }

  activerEdition(): void {
    this.successMessage.set(null);
    this.erreurProfil.set(null);
    this.validationErrors.set({});
    this.syncFormFromUser();
    this.modeEdition.set(true);
  }

  annulerEdition(): void {
    this.modeEdition.set(false);
    this.successMessage.set(null);
    this.erreurProfil.set(null);
    this.validationErrors.set({});
    this.syncFormFromUser();
  }

  saisirChamp(field: keyof ProfilForm, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.form.update((current) => ({ ...current, [field]: value }));

    const erreurs = { ...this.validationErrors() };
    delete erreurs[field];
    this.validationErrors.set(erreurs);
  }

  validerProfil(): { valid: boolean; erreurs: Record<string, string[]> } {
    const valeurs = this.form();
    const erreurs: Record<string, string[]> = {};

    if (!valeurs.prenom.trim()) {
      erreurs['prenom'] = ['Le prénom est requis.'];
    }

    if (!valeurs.nom.trim()) {
      erreurs['nom'] = ['Le nom est requis.'];
    }

    if (!valeurs.email.trim()) {
      erreurs['email'] = ['L’e-mail est requis.'];
    } else if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(valeurs.email.trim())) {
      erreurs['email'] = ['Saisissez une adresse e-mail valide.'];
    }

    const telephone = valeurs.telephone.trim();
    if (telephone && !/^(\+221[0-9]{9}|[0-9]{9})$/.test(telephone)) {
      erreurs['telephone'] = ['Le téléphone doit contenir 9 chiffres ou commencer par +221 suivi de 9 chiffres.'];
    }

    if (!valeurs.adresse.trim()) {
      erreurs['adresse'] = ['L’adresse est requise.'];
    }

    if (!valeurs.date_naissance) {
      erreurs['date_naissance'] = ['La date de naissance est requise.'];
    } else {
      const date = new Date(valeurs.date_naissance);
      const maintenant = new Date();
      if (Number.isNaN(date.getTime()) || date >= maintenant) {
        erreurs['date_naissance'] = ['La date de naissance doit être antérieure à aujourd\'hui.'];
      }
    }

    if (!valeurs.sexe) {
      erreurs['sexe'] = ['Le sexe est requis.'];
    }

    return { valid: Object.keys(erreurs).length === 0, erreurs };
  }

  enregistrerProfil(): void {
    const validation = this.validerProfil();

    if (!validation.valid) {
      this.validationErrors.set(validation.erreurs);
      this.erreurProfil.set('Veuillez corriger les informations indiquées.');
      this.successMessage.set(null);
      return;
    }

    this.enCours.set(true);
    this.erreurProfil.set(null);
    this.validationErrors.set({});

    const payload = {
      prenom: this.form().prenom.trim(),
      nom: this.form().nom.trim(),
      email: this.form().email.trim(),
      telephone: this.form().telephone.trim(),
      adresse: this.form().adresse.trim(),
      date_naissance: this.form().date_naissance,
      sexe: this.form().sexe,
    };

    this.auth.modifierProfil(payload).subscribe({
      next: (res) => {
        this.enCours.set(false);
        this.modeEdition.set(false);
        this.successMessage.set(res.message);
        this.syncFormFromUser();
      },
      error: (err) => {
        this.enCours.set(false);
        this.successMessage.set(null);

        if (err && err.error && err.error.errors) {
          this.validationErrors.set(err.error.errors);
          this.erreurProfil.set(err.error.message || 'Impossible de mettre à jour le profil.');
          return;
        }

        this.erreurProfil.set(err?.error?.message || 'Impossible de mettre à jour le profil pour le moment.');
      },
    });
  }

  syncFormFromUser(): void {
    const user = this.auth.currentUser();
    if (!user) return;

    this.form.set({
      prenom: user.prenom ?? '',
      nom: user.nom ?? '',
      email: user.email ?? '',
      telephone: user.telephone ?? '',
      adresse: user.adresse ?? '',
      date_naissance: user.date_naissance ? new Date(user.date_naissance).toISOString().split('T')[0] : '',
      sexe: user.sexe ?? '',
    });
  }

  confirmarSuppressionErrorMessage(err: any): string {
    if (err && err.error && err.error.message) return err.error.message;
    return 'Impossible de fermer le compte pour le moment.';
  }

  async confirmerSuppression(): Promise<void> {
    const pwd = this.motDePasse().trim();
    if (!pwd) return;
    this.enCours.set(true);
    this.erreur.set(null);

    this.auth.supprimerCompte(pwd).subscribe({
      next: () => {
        // clearSession called in the service; navigation to /connexion handled there
        this.enCours.set(false);
        this.dialogueOuvert.set(false);
      },
      error: (err) => {
        this.erreur.set(this.confirmarSuppressionErrorMessage(err));
        this.enCours.set(false);
      },
    });
  }
}