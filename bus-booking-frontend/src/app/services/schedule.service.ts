import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PagedResult<T> {
  page: number;
  pageSize: number;
  totalCount: number;
  items: T[];
}

export interface ScheduleResponse {
  id: string;
  busId: string;
  routeId: string;
  busCode: string;
  registrationNumber: string;
  routeCode: string;
  busType: number;
  totalSeats: number;
  departureUtc: string;
  basePrice: number;
  amenities: string[];
  createdAtUtc: string;
  updatedAtUtc?: string;
  isCancelledByOperator?: boolean;
  cancelReason?: string;
}

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

export interface SeatAvailabilityResponse {
  scheduleId: string;
  busCode: string;
  totalSeats: number;
  bookedCount: number;
  availableCount: number;
  availableSeats: string[];
  bookedSeats: string[];
}

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
    return this.http.post<PagedResult<ScheduleResponse>>(`${this.base}/search-by-keys`, body);
  }

  createByKeys(body: {
    operatorUsername?: string;
    companyName?: string;
    busCode: string;
    routeCode: string;
    departureUtc?: string;
    departureLocal?: string;
    timeZoneId?: string;
    basePrice: number;
  }): Observable<ScheduleResponse> {
    return this.http.post<ScheduleResponse>(`${this.base}/by-keys`, body);
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
