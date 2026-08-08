import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Medecin {
  id: number;
  nom: string;
  prenom: string;
  photo: string | null;
  experience: number | null;
  langues_parlees: string | null;
  email: string;
  telephone: string | null;
  service: {
    id: number;
    nom: string;
    description: string;
    duree_consultation: number;
  } | null;
}

export interface Creneau {
  id: number;
  code_creneau: string;
  heure_debut: string;
  heure_fin: string;
  status: string;
  planning: {
    id: number;
    date_planning: string;
    status: string;
  };
}

@Injectable({ providedIn: 'root' })
export class MedecinsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getMedecins(): Observable<Medecin[]> {
    return this.http.get<Medecin[]>(`${this.apiUrl}/medecins`);
  }

  getCreneaux(medecinId: number, date?: string): Observable<Creneau[]> {
    let url = `${this.apiUrl}/medecins/${medecinId}/creneaux`;
    if (date) {
      url += `?date=${date}`;
    }
    return this.http.get<Creneau[]>(url);
  }
}