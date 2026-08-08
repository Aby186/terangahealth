import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ServiceMedical {
  id: number;
  nom: string;
  description: string;
  duree_consultation: number;
}

export interface ServicePayload {
  nom: string;
  description: string;
  duree_consultation: number;
}

@Injectable({ providedIn: 'root' })
export class ServicesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getServices(): Observable<ServiceMedical[]> {
    return this.http.get<ServiceMedical[]>(`${this.apiUrl}/services`);
  }

  creer(payload: ServicePayload): Observable<{ message: string; service: ServiceMedical }> {
    return this.http.post<{ message: string; service: ServiceMedical }>(`${this.apiUrl}/services`, payload);
  }

  modifier(id: number, payload: ServicePayload): Observable<{ message: string; service: ServiceMedical }> {
    return this.http.put<{ message: string; service: ServiceMedical }>(`${this.apiUrl}/services/${id}`, payload);
  }

  supprimer(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/services/${id}`);
  }
}