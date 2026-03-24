import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AnnouncementResponse {
  id: string;
  scheduleId: string;
  busCode: string;
  routeCode: string;
  departureUtc: string;
  message: string;
  type: string; // Info | Warning | Delay | Cancelled
  createdAtUtc: string;
}

export interface CreateAnnouncementRequest {
  scheduleId: string;
  message: string;
  type: string;
}

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/announcements`;

  create(dto: CreateAnnouncementRequest): Observable<AnnouncementResponse> {
    return this.http.post<AnnouncementResponse>(this.base, dto);
  }

  getBySchedule(scheduleId: string): Observable<AnnouncementResponse[]> {
    return this.http.get<AnnouncementResponse[]>(`${this.base}/schedule/${scheduleId}`);
  }

  getMy(): Observable<AnnouncementResponse[]> {
    return this.http.get<AnnouncementResponse[]>(`${this.base}/my`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
