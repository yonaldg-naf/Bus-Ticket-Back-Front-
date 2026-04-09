import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/* ---------- Bus ---------- */
export enum BusType {
  Seater = 1, SemiSleeper = 2, Sleeper = 3, AC = 4, NonAC = 5
}
export enum BusStatus {
  Available = 1, UnderRepair = 2, NotAvailable = 3
}
export interface BusResponse {
  id: string;
  code: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  status: BusStatus;
  amenities: string[];
  createdAtUtc: string;
  updatedAtUtc?: string;
}
export interface CreateBusRequest {
  code: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  status?: BusStatus;
  amenities?: string[];
}
export interface UpdateBusRequest {
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  status: BusStatus;
  amenities?: string[];
}

@Injectable({ providedIn: 'root' })
export class BusService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/buses`;

  getAll(): Observable<BusResponse[]> {
    return this.http.get<BusResponse[]>(this.base);
  }

  create(dto: CreateBusRequest): Observable<BusResponse> {
    return this.http.post<BusResponse>(this.base, dto);
  }

  update(id: string, dto: UpdateBusRequest): Observable<BusResponse> {
    return this.http.put<BusResponse>(`${this.base}/${id}`, dto);
  }

  updateStatus(id: string, status: BusStatus): Observable<BusResponse> {
    return this.http.patch<BusResponse>(`${this.base}/${id}/status`, { status });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

/* ---------- Routes ---------- */
export interface StopRef { city: string; name: string; }
export interface RouteStopView {
  stopId: string; order: number; arrivalOffsetMin?: number; departureOffsetMin?: number;
  city: string; name: string;
}
export interface RouteResponse {
  id: string;
  routeCode: string;
  stops: RouteStopView[];
  createdAtUtc: string;
  updatedAtUtc?: string;
}
export interface CreateRouteRequest {
  routeCode: string;
  stops: StopRef[];
}
export interface UpdateRouteRequest {
  newRouteCode: string;
  stops: StopRef[];
}

@Injectable({ providedIn: 'root' })
export class RouteService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/routes`;

  getAll(): Observable<RouteResponse[]> {
    return this.http.get<RouteResponse[]>(this.base);
  }

  create(dto: CreateRouteRequest): Observable<RouteResponse> {
    return this.http.post<RouteResponse>(this.base, dto);
  }

  update(id: string, dto: UpdateRouteRequest): Observable<RouteResponse> {
    return this.http.put<RouteResponse>(`${this.base}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getById(id: string): Observable<RouteResponse> {
    return this.http.get<RouteResponse>(`${this.base}/${id}`);
  }
}
