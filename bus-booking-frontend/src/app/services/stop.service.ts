import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CityResponse, StopResponse } from '../models/stop-route.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StopService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/Stops`;

  // --------------------------
  // PUBLIC READ OPERATIONS
  // --------------------------

  getCities(): Observable<CityResponse[]> {
    return this.http.get<CityResponse[]>(`${this.baseUrl}/cities`);
  }

  getStopsByCity(city: string): Observable<StopResponse[]> {
    return this.http.get<StopResponse[]>(
      `${this.baseUrl}/by-city/${encodeURIComponent(city)}`
    );
  }

  // --------------------------
  // ADMIN CRUD OPERATIONS
  // --------------------------

  createStop(data: {
    city: string;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
  }): Observable<StopResponse> {
    return this.http.post<StopResponse>(`${this.baseUrl}`, data);
  }

  updateStop(
    id: string,
    data: {
      city: string;
      name: string;
      latitude?: number | null;
      longitude?: number | null;
    }
  ): Observable<StopResponse> {
    return this.http.put<StopResponse>(`${this.baseUrl}/${id}`, data);
  }

  deleteStop(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
