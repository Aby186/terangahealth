import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MessageResponse {
  message: string;
}

export interface ReinitialisationPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

@Injectable({ providedIn: 'root' })
export class MotDePasseService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Étape 1 : demander un lien de réinitialisation par e-mail
  demanderLien(email: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/mot-de-passe-oublie`, { email });
  }

  // Étape 2 : enregistrer le nouveau mot de passe grâce au lien reçu
  reinitialiser(payload: ReinitialisationPayload): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/reinitialiser-mot-de-passe`, payload);
  }
}