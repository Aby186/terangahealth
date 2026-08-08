import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-secretaire-profil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.css',
})
export class SecretaireProfilComponent {
  auth = inject(AuthService);

  initiales(): string {
    const u = this.auth.currentUser();
    if (!u) return '';
    return `${u.prenom.charAt(0)}${u.nom.charAt(0)}`;
  }
}