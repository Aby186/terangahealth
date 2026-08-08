import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ListeAttentePayload {
  service_id: number;
  medecin_id?: number;
  date_souhaitee?: string;
}

export interface ListeAttenteResponse {
  message: string;
  liste_attente: {
    id: number;
    statut: string;
    date_souhaitee: string | null;
    service: { nom: string };
    medecin: { nom: string; prenom: string } | null;
  };
}

@Injectable({ providedIn: 'root' })
export class ListeAttenteService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  rejoindre(payload: ListeAttentePayload): Observable<ListeAttenteResponse> {
    return this.http.post<ListeAttenteResponse>(`${this.apiUrl}/liste-attente`, payload);
  }
}