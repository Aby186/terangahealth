import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MotDePasseService } from '../../core/mot-de-passe.service';

function motsDePasseIdentiques(control: AbstractControl): ValidationErrors | null {
  const motDePasse = control.get('password')?.value;
  const confirmation = control.get('password_confirmation')?.value;
  return motDePasse && confirmation && motDePasse !== confirmation ? { mismatch: true } : null;
}

@Component({
  selector: 'app-nouveau-mot-de-passe',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './nouveau-mot-de-passe.component.html',
  styleUrl: './mot-de-passe.css',
})
export class NouveauMotDePasseComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private motDePasseService = inject(MotDePasseService);

  // Ces deux valeurs viennent du lien reçu par e-mail
  private token = '';
  private email = '';

  lienPresent = signal(true);
  loading = signal(false);
  termine = signal(false);
  message = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  afficher = signal(false);

  form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required],
    },
    { validators: motsDePasseIdentiques }
  );

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.lienPresent.set(!!this.token && !!this.email);
  }

  basculerAffichage(): void {
    this.afficher.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const valeurs = this.form.getRawValue();

    this.motDePasseService
      .reinitialiser({
        email: this.email,
        token: this.token,
        password: valeurs.password!,
        password_confirmation: valeurs.password_confirmation!,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.message.set(res.message);
          this.termine.set(true);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.errorMessage.set(
            err.status === 429
              ? 'Trop de tentatives. Réessayez dans une minute.'
              : err.error?.message ?? 'Une erreur est survenue. Réessayez plus tard.'
          );
        },
      });
  }
}