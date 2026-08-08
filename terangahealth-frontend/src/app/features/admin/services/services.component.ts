import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ServicesService, ServiceMedical } from '../../../core/services.service';

@Component({
  selector: 'app-admin-services',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './services.component.html',
  styleUrl: './services.component.css',
})
export class AdminServicesComponent implements OnInit {
  private servicesService = inject(ServicesService);
  private fb = inject(FormBuilder);

  services = signal<ServiceMedical[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  traitementEnCoursId = signal<number | null>(null);

  recherche = signal('');
  servicesFiltres = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    if (!terme) return this.services();
    return this.services().filter(
      (s) => s.nom.toLowerCase().includes(terme) || s.description.toLowerCase().includes(terme)
    );
  });

  formulaireOuvert = signal(false);
  serviceEnEditionId = signal<number | null>(null);
  enregistrementEnCours = signal(false);

  form = this.fb.group({
    nom: ['', Validators.required],
    description: ['', Validators.required],
    duree_consultation: [30, [Validators.required, Validators.min(5), Validators.max(180)]],
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.loading.set(true);
    this.servicesService.getServices().subscribe({
      next: (data) => {
        this.services.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Impossible de charger les services.');
        this.loading.set(false);
      },
    });
  }

  reinitialiser(): void {
    this.recherche.set('');
  }

  iconPath(nom: string): string {
    const n = nom.toLowerCase();
    if (n.includes('cardio')) return 'M12 21s-7-4.4-9.5-9C.7 8.4 2.4 5 6 5c2 0 3.4 1 4.5 2.4C11.6 6 13 5 15 5c3.6 0 5.3 3.4 3.5 7-2.5 4.6-9.5 9-9.5 9z';
    if (n.includes('dermato')) return 'M12 2a9 9 0 00-9 9c0 4 2.5 6.5 5 8.5.8.6 1.6 1 2.5 1.5.9-.5 1.7-.9 2.5-1.5 2.5-2 5-4.5 5-8.5a9 9 0 00-9-9z';
    if (n.includes('pédiatr')) return 'M9 12a3 3 0 106 0 3 3 0 00-6 0zM5 8a3 3 0 016 0M13 8a3 3 0 016 0M6 21c0-4 2.7-6 6-6s6 2 6 6';
    if (n.includes('diabéto')) return 'M12 2.5c-2 4-6 8.3-6 12a6 6 0 0012 0c0-3.7-4-8-6-12z';
    if (n.includes('orl')) return 'M4 6a2 2 0 012-2h3l2 4-1.5 1.5a11 11 0 006 6L17 14l4 2v3a2 2 0 01-2 2C10.5 21 4 14.5 4 6z';
    if (n.includes('gastro')) return 'M8 3v6a4 4 0 004 4 4 4 0 004-4V3M8 3H6M16 3h2M12 13v8';
    return 'M12 2l2.9 6.3L22 9l-5 5 1.3 7.2L12 17.8 5.7 21.2 7 14 2 9l7.1-.7z';
  }

  ouvrirCreation(): void {
    this.serviceEnEditionId.set(null);
    this.form.reset({ duree_consultation: 30 });
    this.formulaireOuvert.set(true);
  }

  ouvrirEdition(service: ServiceMedical): void {
    this.serviceEnEditionId.set(service.id);
    this.form.setValue({
      nom: service.nom,
      description: service.description,
      duree_consultation: service.duree_consultation,
    });
    this.formulaireOuvert.set(true);
  }

  fermerFormulaire(): void {
    this.formulaireOuvert.set(false);
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enregistrementEnCours.set(true);
    this.errorMessage.set(null);

    const valeurs = this.form.getRawValue();
    const editionId = this.serviceEnEditionId();

    const requete = editionId
      ? this.servicesService.modifier(editionId, valeurs as any)
      : this.servicesService.creer(valeurs as any);

    requete.subscribe({
      next: (res: any) => {
        this.enregistrementEnCours.set(false);
        this.successMessage.set(res.message);
        this.formulaireOuvert.set(false);
        this.charger();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
     error: (err: any) => {
        this.enregistrementEnCours.set(false);
        this.errorMessage.set(err.error?.message ?? 'Impossible d\'enregistrer ce service.');
      },
    });
  }

  supprimer(id: number): void {
    if (!confirm('Supprimer définitivement ce service ?')) return;

    this.traitementEnCoursId.set(id);
    this.servicesService.supprimer(id).subscribe({
      next: () => {
        this.traitementEnCoursId.set(null);
        this.charger();
      },
      error: (err) => {
        this.traitementEnCoursId.set(null);
        this.errorMessage.set(err.error?.message ?? 'Impossible de supprimer ce service.');
      },
    });
  }
}