import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MotDePasseService } from '../../core/mot-de-passe.service';

@Component({
  selector: 'app-mot-de-passe-oublie',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './mot-de-passe-oublie.component.html',
  styleUrl: './mot-de-passe.css',
})
export class MotDePasseOublieComponent {
  private fb = inject(FormBuilder);
  private motDePasseService = inject(MotDePasseService);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  loading = signal(false);
  message = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.motDePasseService.demanderLien(this.form.value.email!).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.message.set(res.message);
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