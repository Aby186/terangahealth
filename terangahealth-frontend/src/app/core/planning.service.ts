import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreneauPlanning {
  id: number;
  planning_id: number;
  code_creneau: string;
  heure_debut: string;
  heure_fin: string;
  status: string;
}

export interface PlanningItem {
  id: number;
  medecin_id: number;
  date_planning: string;
  status: string;
  creneaux: CreneauPlanning[];
}

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getPlannings(medecinId: number): Observable<PlanningItem[]> {
    return this.http.get<PlanningItem[]>(`${this.apiUrl}/plannings?medecin_id=${medecinId}`);
  }

  creerPlanning(medecinId: number, datePlanning: string): Observable<{ message: string; planning: PlanningItem }> {
    return this.http.post<{ message: string; planning: PlanningItem }>(`${this.apiUrl}/plannings`, {
      medecin_id: medecinId,
      date_planning: datePlanning,
    });
  }

  genererCreneaux(
    planningId: number,
    heureDebut: string,
    heureFin: string,
    dureeCreneau: number
  ): Observable<{ message: string; creneaux: CreneauPlanning[] }> {
    return this.http.post<{ message: string; creneaux: CreneauPlanning[] }>(
      `${this.apiUrl}/plannings/${planningId}/creneaux`,
      { heure_debut: heureDebut, heure_fin: heureFin, duree_creneau: dureeCreneau }
    );
  }

  toggleStatus(planningId: number): Observable<{ message: string; planning: PlanningItem }> {
    return this.http.put<{ message: string; planning: PlanningItem }>(`${this.apiUrl}/plannings/${planningId}/toggle`, {});
  }

  supprimerCreneau(creneauId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/creneaux/${creneauId}`);
  }

  bloquerCreneau(creneauId: number): Observable<{ message: string; creneau: CreneauPlanning; a_reprogrammer: boolean }> {
    return this.http.put<{ message: string; creneau: CreneauPlanning; a_reprogrammer: boolean }>(`${this.apiUrl}/creneaux/${creneauId}/bloquer`, {});
  }

  supprimerPlanning(planningId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/plannings/${planningId}`);
  }
}