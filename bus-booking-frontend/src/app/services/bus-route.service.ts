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
  operatorId: string;
  code: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  status: BusStatus;
  createdAtUtc: string;
  updatedAtUtc?: string;
}
export interface CreateBusByOperatorRequest {
  operatorUsername?: string;
  companyName?: string;
  code: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  status?: BusStatus;
}
export interface UpdateBusRequest {
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  status: BusStatus;
}

@Injectable({ providedIn: 'root' })
export class BusService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/buses`;

  getAll(): Observable<BusResponse[]> {
    return this.http.get<BusResponse[]>(`${this.base}`);
  }

  getById(id: string): Observable<BusResponse> {
    return this.http.get<BusResponse>(`${this.base}/${id}`);
  }

  // Backend supports POST /api/Buses/by-operator
  createByOperator(dto: CreateBusByOperatorRequest): Observable<BusResponse> {
    return this.http.post<BusResponse>(`${this.base}/by-operator`, dto);
  }

  update(id: string, dto: UpdateBusRequest): Observable<BusResponse> {
    return this.http.put<BusResponse>(`${this.base}/${id}`, dto);
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
  operatorId: string;
  routeCode: string;
  stops: RouteStopView[];
  createdAtUtc: string;
  updatedAtUtc?: string;
}
export interface CreateRouteByKeysRequest {
  operatorUsername?: string;
  companyName?: string;
  routeCode: string;
  stops: StopRef[];
}
export interface UpdateRouteByKeysRequest {
  newRouteCode: string;
  stops: StopRef[];
}

@Injectable({ providedIn: 'root' })
export class RouteService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/routes`;

  getAll(): Observable<RouteResponse[]> {
    return this.http.get<RouteResponse[]>(`${this.base}`);
  }

  getById(id: string): Observable<RouteResponse> {
    return this.http.get<RouteResponse>(`${this.base}/${id}`);
  }

  getByCode(operatorIdentity: string, routeCode: string): Observable<RouteResponse> {
    return this.http.get<RouteResponse>(`${this.base}/${operatorIdentity}/${routeCode}`);
  }

  createByKeys(dto: CreateRouteByKeysRequest): Observable<RouteResponse> {
    return this.http.post<RouteResponse>(`${this.base}/by-keys`, dto);
  }

  updateByKeys(operatorIdentity: string, routeCode: string, dto: UpdateRouteByKeysRequest): Observable<RouteResponse> {
    return this.http.put<RouteResponse>(`${this.base}/${operatorIdentity}/${routeCode}`, dto);
  }

  deleteByKeys(operatorIdentity: string, routeCode: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${operatorIdentity}/${routeCode}`);
  }
}