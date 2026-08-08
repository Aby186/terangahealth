import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UtilisateurItem {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  role: 'patient' | 'medecin' | 'secretaire' | 'administrateur';
  statut: string;
  matricule: string | null;
  code_patient: string | null;
  service_id: number | null;
  experience: number | null;
  langues_parlees: string | null;
  service: { id: number; nom: string } | null;
  created_at: string;
  last_login_at: string | null;
}

export interface CreerUtilisateurPayload {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  password: string;
  role: 'medecin' | 'secretaire' | 'administrateur';
  service_id?: number;
  experience?: number;
  langues_parlees?: string;
}

@Injectable({ providedIn: 'root' })
export class UtilisateursService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  lister(role?: string): Observable<UtilisateurItem[]> {
    const url = role ? `${this.apiUrl}/utilisateurs?role=${role}` : `${this.apiUrl}/utilisateurs`;
    return this.http.get<UtilisateurItem[]>(url);
  }

  creer(payload: CreerUtilisateurPayload): Observable<{ message: string; user: UtilisateurItem }> {
    return this.http.post<{ message: string; user: UtilisateurItem }>(`${this.apiUrl}/utilisateurs`, payload);
  }

  modifier(id: number, payload: Partial<CreerUtilisateurPayload>): Observable<{ message: string; user: UtilisateurItem }> {
    return this.http.put<{ message: string; user: UtilisateurItem }>(`${this.apiUrl}/utilisateurs/${id}`, payload);
  }

  toggleStatut(id: number): Observable<{ message: string; user: UtilisateurItem }> {
    return this.http.put<{ message: string; user: UtilisateurItem }>(`${this.apiUrl}/utilisateurs/${id}/toggle-statut`, {});
  }

  supprimer(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/utilisateurs/${id}`);
  }
}