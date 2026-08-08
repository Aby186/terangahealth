import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { UtilisateursService, UtilisateurItem } from '../../../core/utilisateurs.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pass = control.get('nouveau_mot_de_passe')?.value;
  const confirm = control.get('nouveau_mot_de_passe_confirmation')?.value;
  return pass === confirm ? null : { mismatch: true };
}

function passwordsMatchReset(control: AbstractControl): ValidationErrors | null {
  const pass = control.get('nouveau_mot_de_passe')?.value;
  const confirm = control.get('nouveau_mot_de_passe_confirmation')?.value;
  return pass === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-admin-securite',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './securite.component.html',
  styleUrl: './securite.component.css',
})
export class AdminSecuriteComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private utilisateursService = inject(UtilisateursService);

  // ---------- Mon propre mot de passe ----------
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  form = this.fb.group({
    mot_de_passe_actuel: ['', Validators.required],
    nouveau_mot_de_passe: ['', [Validators.required, Validators.minLength(6)]],
    nouveau_mot_de_passe_confirmation: ['', Validators.required],
  }, { validators: passwordsMatch });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.http.put<{ message: string }>(`${environment.apiUrl}/mon-mot-de-passe`, this.form.getRawValue())
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.successMessage.set(res.message);
          this.form.reset();
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.message ?? 'Une erreur est survenue.');
        },
      });
  }

  // ---------- Réinitialiser le mot de passe d'un autre utilisateur ----------
  utilisateurs = signal<UtilisateurItem[]>([]);
  resetLoading = signal(false);
  resetErrorMessage = signal<string | null>(null);
  resetSuccessMessage = signal<string | null>(null);

  resetForm = this.fb.group({
    utilisateur_id: ['', Validators.required],
    nouveau_mot_de_passe: ['', [Validators.required, Validators.minLength(6)]],
    nouveau_mot_de_passe_confirmation: ['', Validators.required],
  }, { validators: passwordsMatchReset });

  ngOnInit(): void {
    this.utilisateursService.lister().subscribe({
      next: (data) => this.utilisateurs.set(data),
    });
  }

  submitReset(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.resetLoading.set(true);
    this.resetErrorMessage.set(null);
    this.resetSuccessMessage.set(null);

    const valeurs = this.resetForm.getRawValue();

    this.http.put<{ message: string }>(
      `${environment.apiUrl}/utilisateurs/${valeurs.utilisateur_id}/reinitialiser-mot-de-passe`,
      { nouveau_mot_de_passe: valeurs.nouveau_mot_de_passe }
    ).subscribe({
      next: (res) => {
        this.resetLoading.set(false);
        this.resetSuccessMessage.set(res.message);
        this.resetForm.reset();
      },
      error: (err) => {
        this.resetLoading.set(false);
        this.resetErrorMessage.set(err.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }
}
