import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MedecinsService, Medecin, Creneau } from '../../core/medecins.service';
import { RendezVousService } from '../../core/rendez-vous.service';
import { ListeAttenteService } from '../../core/liste-attente.service';

@Component({
  selector: 'app-prendre-rdv',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './prendre-rdv.component.html',
  styleUrl: './prendre-rdv.component.css',
})
export class PrendreRdvComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private medecinsService = inject(MedecinsService);
  private rendezVousService = inject(RendezVousService);
  private listeAttenteService = inject(ListeAttenteService);

  // liste complète, utilisée uniquement si on arrive sans medecinId dans l'URL
  tousLesMedecins = signal<Medecin[]>([]);
  medecinIdDepuisUrl = signal<number | null>(null);

  medecin = signal<Medecin | null>(null);
  creneaux = signal<Creneau[]>([]);
  loadingCreneaux = signal(false);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  rejoignantListeAttente = signal(false);
  listeAttenteMessage = signal<string | null>(null);

  form = this.fb.group({
    medecin_id: ['', Validators.required],
    date: ['', Validators.required],
    creneau_id: ['', Validators.required],
    motif: ['', [Validators.required, Validators.minLength(10)]],
    notes: [''],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('medecinId');
    const medecinId = idParam ? Number(idParam) : null;
    this.medecinIdDepuisUrl.set(medecinId);

    this.medecinsService.getMedecins().subscribe({
      next: (medecins) => {
        this.tousLesMedecins.set(medecins);

        if (medecinId) {
          // arrivée depuis une carte médecin : on pré-sélectionne et verrouille
          const found = medecins.find((m) => m.id === medecinId);
          this.medecin.set(found ?? null);
          this.form.patchValue({ medecin_id: String(medecinId) });
        }
      },
    });
  }

  onMedecinChange(): void {
    const id = Number(this.form.value.medecin_id);
    const found = this.tousLesMedecins().find((m) => m.id === id);
    this.medecin.set(found ?? null);

    // on réinitialise la date/créneau puisqu'ils dépendent du médecin choisi
    this.form.patchValue({ date: '', creneau_id: '' });
    this.creneaux.set([]);
  }

  onDateChange(): void {
    const date = this.form.value.date;
    const medecinId = Number(this.form.value.medecin_id);

    if (!date || !medecinId) return;

    this.loadingCreneaux.set(true);
    this.form.patchValue({ creneau_id: '' });
    this.listeAttenteMessage.set(null);

    this.medecinsService.getCreneaux(medecinId, date).subscribe({
      next: (data) => {
        this.creneaux.set(data);
        this.loadingCreneaux.set(false);
      },
      error: () => {
        this.loadingCreneaux.set(false);
        this.errorMessage.set('Impossible de charger les créneaux.');
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.rendezVousService
      .creer({
        medecin_id: Number(this.form.value.medecin_id),
        creneau_id: Number(this.form.value.creneau_id),
        motif: this.form.value.motif!,
        notes: this.form.value.notes || undefined,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.successMessage.set(res.message);
          setTimeout(() => this.router.navigate(['/mes-rendez-vous']), 2000);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errorMessage.set(err.error?.message ?? 'Une erreur est survenue.');
        },
      });
  }

  rejoindreListeAttente(): void {
    const m = this.medecin();
    if (!m || !m.service) return;

    this.rejoignantListeAttente.set(true);
    this.listeAttenteMessage.set(null);

    this.listeAttenteService
      .rejoindre({
        service_id: m.service.id,
        medecin_id: m.id,
        date_souhaitee: this.form.value.date || undefined,
      })
      .subscribe({
        next: (res) => {
          this.rejoignantListeAttente.set(false);
          this.listeAttenteMessage.set(res.message);
        },
        error: (err) => {
          this.rejoignantListeAttente.set(false);
          this.listeAttenteMessage.set(err.error?.message ?? 'Une erreur est survenue.');
        },
      });
  }

  nomComplet(): string {
    const m = this.medecin();
    return m ? `Dr ${m.prenom} ${m.nom}` : '';
  }

  isSelected(creneauId: number): boolean {
    return Number(this.form.value.creneau_id) === creneauId;
  }
}