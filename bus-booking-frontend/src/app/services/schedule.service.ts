import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ScheduleResponse, SeatAvailabilityResponse, PagedResult } from '../models/bus-schedule.models';

export interface SearchSchedulesByKeysRequest {
  fromCity: string;
  fromStopName?: string;
  toCity: string;
  toStopName?: string;
  date: string;
  utcOffsetMinutes?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
  busType?: number;
  minPrice?: number;
  maxPrice?: number;
}

export { PagedResult, ScheduleResponse, SeatAvailabilityResponse };

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/schedules`;

  getAll(): Observable<ScheduleResponse[]> {
    return this.http.get<ScheduleResponse[]>(`${this.base}`);
  }

  getById(id: string): Observable<ScheduleResponse> {
    return this.http.get<ScheduleResponse>(`${this.base}/${id}`);
  }

  getSeatAvailability(scheduleId: string): Observable<SeatAvailabilityResponse> {
    return this.http.get<SeatAvailabilityResponse>(`${this.base}/${scheduleId}/seats`);
  }

  searchByKeys(body: SearchSchedulesByKeysRequest): Observable<PagedResult<ScheduleResponse>> {
    return this.http.post<PagedResult<ScheduleResponse>>(`${this.base}/search`, body);
  }

  createSchedule(body: { busId: string; routeId: string; departureUtc: string; basePrice: number }): Observable<ScheduleResponse> {
    return this.http.post<ScheduleResponse>(this.base, body);
  }

  update(id: string, body: { departureLocal: string; timeZoneId: string; basePrice: number }): Observable<ScheduleResponse> {
    return this.http.put<ScheduleResponse>(`${this.base}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  cancel(id: string, reason: string): Observable<ScheduleResponse> {
    return this.http.patch<ScheduleResponse>(`${this.base}/${id}/cancel`, { reason });
  }
}
