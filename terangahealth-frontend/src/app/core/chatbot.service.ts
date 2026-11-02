import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ServiceRecommande {
  id: number;
  nom: string;
  description: string;
  nombre_medecins: number;
  premier_medecin_id: number | null;
}

export interface OrienterResponse {
  reponse: string;
  services: ServiceRecommande[];
}

export interface HistoriqueChatMessage {
  role: 'patient' | 'assistant';
  texte: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  orienter(message: string, historique: HistoriqueChatMessage[] = []): Observable<OrienterResponse> {
    return this.http.post<OrienterResponse>(`${this.apiUrl}/chatbot/orienter`, { message, historique });
  }
}