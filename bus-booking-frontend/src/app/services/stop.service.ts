import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CityResponse { city: string; stopCount: number; }
export interface StopResponse {
  id: string;
  city: string;
  name: string;
  latitude?: number;
  longitude?: number;
}

@Injectable({ providedIn: 'root' })
export class StopService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/stops`;

  getCities(): Observable<CityResponse[]> {
    return this.http.get<CityResponse[]>(`${this.base}/cities`);
  }

  getStopsByCity(city: string): Observable<StopResponse[]> {
    const params = new HttpParams().set('city', city);
    return this.http.get<StopResponse[]>(`${this.base}`, { params });
  }
}