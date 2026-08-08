import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { UtilisateursService, UtilisateurItem } from '../../../core/utilisateurs.service';
import { ServicesService, ServiceMedical } from '../../../core/services.service';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-admin-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './utilisateurs.component.html',
  styleUrl: './utilisateurs.component.css',
})
export class AdminUtilisateursComponent implements OnInit {
  private utilisateursService = inject(UtilisateursService);
  private servicesService = inject(ServicesService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  utilisateurs = signal<UtilisateurItem[]>([]);
  services = signal<ServiceMedical[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  traitementEnCoursId = signal<number | null>(null);

  filtreRole = signal('tous');
  recherche = signal('');

  formulaireOuvert = signal(false);
  creationEnCours = signal(false);
  utilisateurEnEditionId = signal<number | null>(null);

  utilisateursFiltres = computed(() => {
    const role = this.filtreRole();
    const terme = this.recherche().toLowerCase().trim();

    return this.utilisateurs().filter((u) => {
      const matchRole = role === 'tous' || u.role === role;
      const nomComplet = `${u.prenom} ${u.nom}`.toLowerCase();
      const matchTexte = !terme || nomComplet.includes(terme) || u.email.toLowerCase().includes(terme);
      return matchRole && matchTexte;
    });
  });

  totalUtilisateurs = computed(() => this.utilisateurs().length);
  totalMedecins = computed(() => this.utilisateurs().filter((u) => u.role === 'medecin').length);
  totalSecretaires = computed(() => this.utilisateurs().filter((u) => u.role === 'secretaire').length);
  totalPatients = computed(() => this.utilisateurs().filter((u) => u.role === 'patient').length);

  form = this.fb.group({
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['medecin', Validators.required],
    service_id: [''],
    experience: [''],
    langues_parlees: [''],
  });

  ngOnInit(): void {
    this.charger();
    this.servicesService.getServices().subscribe({
      next: (data) => this.services.set(data),
    });
  }

  charger(): void {
    this.loading.set(true);
    this.utilisateursService.lister().subscribe({
      next: (data) => {
        this.utilisateurs.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les utilisateurs.');
        this.loading.set(false);
      },
    });
  }

  selectFiltreRole(role: string): void {
    this.filtreRole.set(role);
  }

  ouvrirFormulaire(): void {
    this.utilisateurEnEditionId.set(null);
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.formulaireOuvert.set(true);
    this.form.reset({ role: 'medecin' });
  }

  ouvrirEdition(u: UtilisateurItem): void {
    this.utilisateurEnEditionId.set(u.id);
    this.form.get('password')?.setValidators([Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.form.reset({
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      telephone: u.telephone ?? '',
      password: '',
      role: u.role,
      service_id: u.service_id != null ? String(u.service_id) : '',
      experience: u.experience != null ? String(u.experience) : '',
      langues_parlees: u.langues_parlees ?? '',
    });
    this.formulaireOuvert.set(true);
  }

  fermerFormulaire(): void {
    this.formulaireOuvert.set(false);
    this.utilisateurEnEditionId.set(null);
  }

  soumettreFormulaire(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.creationEnCours.set(true);
    this.errorMessage.set(null);

    const valeurs = this.form.getRawValue();
    const editionId = this.utilisateurEnEditionId();
    const payload: any = {
      nom: valeurs.nom,
      prenom: valeurs.prenom,
      email: valeurs.email,
      telephone: valeurs.telephone || undefined,
      role: valeurs.role,
    };
    if (valeurs.password) {
      payload.password = valeurs.password;
    }

    if (valeurs.role === 'medecin') {
      payload.service_id = valeurs.service_id ? Number(valeurs.service_id) : undefined;
      payload.experience = valeurs.experience ? Number(valeurs.experience) : undefined;
      payload.langues_parlees = valeurs.langues_parlees || undefined;
    }

    const requete = editionId
      ? this.utilisateursService.modifier(editionId, payload)
      : this.utilisateursService.creer(payload);

    requete.subscribe({
      next: (res) => {
        this.creationEnCours.set(false);
        this.successMessage.set(res.message);
        this.formulaireOuvert.set(false);
        this.utilisateurEnEditionId.set(null);
        this.charger();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.creationEnCours.set(false);
        this.errorMessage.set(err.error?.message ?? (editionId ? 'Impossible de modifier cet utilisateur.' : 'Impossible de créer cet utilisateur.'));
      },
    });
  }

  toggleStatut(id: number): void {
    this.traitementEnCoursId.set(id);
    this.utilisateursService.toggleStatut(id).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.charger();
      },
      error: (err) => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set(err.error?.message ?? 'Impossible de modifier le statut.');
      },
    });
  }

  supprimer(id: number): void {
    if (!confirm('Supprimer définitivement cet utilisateur ?')) return;

    this.traitementEnCoursId.set(id);
    this.utilisateursService.supprimer(id).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.charger();
      },
      error: (err) => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set(err.error?.message ?? 'Impossible de supprimer cet utilisateur.');
      },
    });
  }

  estMoiMeme(id: number): boolean {
    return this.auth.currentUser()?.id === id;
  }

  nomComplet(u: UtilisateurItem): string {
    return `${u.prenom} ${u.nom}`;
  }

  initiales(u: UtilisateurItem): string {
    return `${u.prenom.charAt(0)}${u.nom.charAt(0)}`;
  }

  roleLabel(role: string): string {
    const labels: Record<string, string> = {
      patient: 'Patient',
      medecin: 'Médecin',
      secretaire: 'Secrétaire',
      administrateur: 'Administrateur',
    };
    return labels[role] ?? role;
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Jamais connecté';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}