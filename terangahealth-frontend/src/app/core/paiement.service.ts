import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InitierPaiementPayload {
  medecin_id: number;
  creneau_id: number;
  motif: string;
  notes?: string;
}

export interface InitierPaiementResponse {
  paiement_id: number;
  url_paiement: string;
}

export interface PaiementHistorique {
  id: number;
  montant: string;
  methode: string | null;
  statut: string;
  date_paiement: string | null;
  created_at: string;
  rendez_vous: {
    id: number;
    numero_rendez_vous: string;
    patient: { nom: string; prenom: string };
    medecin: { nom: string; prenom: string };
    service: { nom: string } | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class PaiementService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  initier(payload: InitierPaiementPayload): Observable<InitierPaiementResponse> {
    return this.http.post<InitierPaiementResponse>(`${this.apiUrl}/paiements/initier`, payload);
  }

  historique(): Observable<PaiementHistorique[]> {
    return this.http.get<PaiementHistorique[]>(`${this.apiUrl}/paiements/historique`);
  }

  statut(paiementId: number): Observable<{ statut: 'en_attente' | 'paye' | 'echoue'; rendez_vous_id: number | null }> {
    return this.http.get<{ statut: 'en_attente' | 'paye' | 'echoue'; rendez_vous_id: number | null }>(`${this.apiUrl}/paiements/${paiementId}/statut`);
  }
}