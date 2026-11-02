import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MessageItem {
  id: number;
  expediteur_id: number;
  destinataire_id: number;
  contenu: string;
  lu: boolean;
  created_at: string;
  expediteur: { id: number; nom: string; prenom: string };
  destinataire: { id: number; nom: string; prenom: string };
}

export interface Contact {
  id: number;
  nom: string;
  prenom: string;
  role: string;
}

export interface Conversation {
  utilisateur: Contact;
  dernier_message: string;
  date: string;
  non_lus: number;
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  envoyer(destinataireId: number, contenu: string): Observable<{ message_envoye: MessageItem }> {
    return this.http.post<{ message_envoye: MessageItem }>(`${this.apiUrl}/messages`, {
      destinataire_id: destinataireId,
      contenu,
    });
  }

  lister(avecId?: number): Observable<MessageItem[]> {
    const url = avecId ? `${this.apiUrl}/messages?avec=${avecId}` : `${this.apiUrl}/messages`;
    return this.http.get<MessageItem[]>(url);
  }

  conversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/messages/conversations`);
  }

  contacts(): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.apiUrl}/messages/contacts`);
  }

  marquerLu(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/messages/${id}/marquer-lu`, {});
  }

  supprimer(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/messages/${id}`);
  }

  modifier(id: number, contenu: string): Observable<{ message_modifie: MessageItem }> {
    return this.http.put<{ message_modifie: MessageItem }>(`${this.apiUrl}/messages/${id}`, { contenu });
  }

  supprimerConversation(userId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/messages/conversation/${userId}`);
  }
}