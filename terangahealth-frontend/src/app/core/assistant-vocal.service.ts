import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreneauPropose {
  creneau_id: number;
  medecin_id: number;
  medecin: string;
  date: string;
  heure: string;
}

export interface ReponseAssistant {
  etape_suivante: string | null;
  compris_fr: string | null;
  reponse_fr: string | null;
  reponse_wo: string | null;
  audio_base64: string | null;
  url_paiement?: string | null;
  service_id: number | null;
  creneaux: CreneauPropose[];
}

@Injectable({ providedIn: 'root' })
export class AssistantVocalService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  converser(etape: 'debut' | 'specialite', audio?: Blob): Observable<ReponseAssistant> {
    const formData = new FormData();
    formData.append('etape', etape);

    if (audio) {
      formData.append('audio', audio, 'enregistrement.wav');
    }

    return this.http.post<ReponseAssistant>(`${this.apiUrl}/assistant-vocal/converser`, formData);
  }
}
