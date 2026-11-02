import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RendezVousPayload {
  medecin_id: number;
  creneau_id: number;
  motif: string;
  notes?: string;
}

export interface RendezVousItem {
  id: number;
  numero_rendez_vous: string;
  motif: string;
  status: string;
  urgent: boolean;
  date_rendez_vous: string;
  heure_rendez_vous: string;
  medecin_id: number;
  patient_id: number;
  medecin: { nom: string; prenom: string };
  patient: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    telephone: string | null;
    sexe: string | null;
    date_naissance: string | null;
  };
  service: { nom: string } | null;
  rappel_48h_envoye: boolean;
  rappel_24h_envoye: boolean;
  rappel_jourj_envoye: boolean;
  rappel_2h_envoye: boolean;
}

export interface RendezVousResponse {
  message: string;
  rendez_vous: RendezVousItem;
}

export interface AlertesReprogrammationResponse {
  total: number;
  rendez_vous: RendezVousItem[];
}

export interface NotifierReprogrammationResponse {
  email_envoye: boolean;
  patient_a_email: boolean;
  sms: 'envoye' | 'simule' | 'non_envoye';
}

@Injectable({ providedIn: 'root' })
export class RendezVousService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  creer(payload: RendezVousPayload): Observable<RendezVousResponse> {
    return this.http.post<RendezVousResponse>(`${this.apiUrl}/rendez-vous`, payload);
  }

  lister(): Observable<RendezVousItem[]> {
    return this.http.get<RendezVousItem[]>(`${this.apiUrl}/rendez-vous`);
  }

  annuler(id: number): Observable<RendezVousResponse> {
    return this.http.put<RendezVousResponse>(`${this.apiUrl}/rendez-vous/${id}/cancel`, {});
  }

  confirmer(id: number): Observable<RendezVousResponse> {
    return this.http.put<RendezVousResponse>(`${this.apiUrl}/rendez-vous/${id}/confirm`, {});
  }

  refuser(id: number): Observable<RendezVousResponse> {
    return this.http.put<RendezVousResponse>(`${this.apiUrl}/rendez-vous/${id}/cancel`, {});
  }

  reprogrammer(id: number, creneauId: number): Observable<RendezVousResponse> {
    return this.http.put<RendezVousResponse>(`${this.apiUrl}/rendez-vous/${id}/reprogrammer`, { creneau_id: creneauId });
  }

  notifierReprogrammation(id: number, ancienneDate: string, ancienneHeure: string): Observable<NotifierReprogrammationResponse> {
    return this.http.post<NotifierReprogrammationResponse>(`${this.apiUrl}/rendez-vous/${id}/notifier-reprogrammation`, {
      ancienne_date: ancienneDate,
      ancienne_heure: ancienneHeure,
    });
  }

  supprimer(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/rendez-vous/${id}`);
  }

  alertesReprogrammation(): Observable<AlertesReprogrammationResponse> {
    return this.http.get<AlertesReprogrammationResponse>(`${this.apiUrl}/alertes/reprogrammation`);
  }
}