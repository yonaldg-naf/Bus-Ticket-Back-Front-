import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/* ---------- Common models ---------- */
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
  busType: number;        // 1=Seater 2=SemiSleeper 3=Sleeper 4=AC 5=NonAC
  totalSeats: number;
  departureUtc: string;   // ISO string
  basePrice: number;
  createdAtUtc: string;   // ISO string
  updatedAtUtc?: string;  // ISO string
}

export interface SearchSchedulesByKeysRequest {
  fromCity: string;
  fromStopName?: string;
  toCity: string;
  toStopName?: string;
  date: string;       // ISO date (yyyy-MM-dd)
  page?: number;
  pageSize?: number;
  sortBy?: string;    // 'departure' | 'price' | 'busCode' | 'routeCode'
  sortDir?: string;   // 'asc' | 'desc'
  busType?: number;   // 1=Seater 2=SemiSleeper 3=Sleeper 4=AC 5=NonAC
  minPrice?: number;
  maxPrice?: number;
}

/** NOTE: `busCode` is added to satisfy existing component typing. */
export interface SeatAvailabilityResponse {
  scheduleId: string;
  /** present in models used by the component */
  busCode: string;
  totalSeats: number;
  bookedCount: number;
  availableCount: number;
  availableSeats: string[];
  bookedSeats: string[];
}

/* ---------- Service ---------- */
@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/schedules`;

  /** GET /api/Schedules */
  getAll(): Observable<ScheduleResponse[]> {
    return this.http.get<ScheduleResponse[]>(`${this.base}`);
  }

  /** GET /api/Schedules/{id} */
  getById(id: string): Observable<ScheduleResponse> {
    return this.http.get<ScheduleResponse>(`${this.base}/${id}`);
  }

  /** GET /api/Schedules/{id}/seats */
  getSeatAvailability(scheduleId: string): Observable<SeatAvailabilityResponse> {
    return this.http.get<SeatAvailabilityResponse>(`${this.base}/${scheduleId}/seats`);
  }

  /**
   * POST /api/Schedules/search-by-keys
   * Search by human-friendly location names (cities, optional stop names) and date.
   */
  searchByKeys(body: SearchSchedulesByKeysRequest): Observable<PagedResult<ScheduleResponse>> {
    return this.http.post<PagedResult<ScheduleResponse>>(`${this.base}/search-by-keys`, body);
  }

  /**
   * [Compatibility shim] Many callers used `searchByCity` earlier.
   * Keep the name to avoid refactors, delegate to searchByKeys.
   * Return `any` so downstream code that typed `res` as implicit any won’t error.
   */
  searchByCity(body: SearchSchedulesByKeysRequest): Observable<any> {
    return this.searchByKeys(body) as unknown as Observable<any>;
  }

  /**
   * GET /api/Schedules/search?fromStopId=&toStopId=&date=&page=&pageSize=&sortBy=&sortDir=
   */
  searchByStopIds(params: {
    fromStopId: string;
    toStopId: string;
    date: string;                // ISO date
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: string;
  }): Observable<PagedResult<ScheduleResponse>> {
    let httpParams = new HttpParams()
      .set('fromStopId', params.fromStopId)
      .set('toStopId', params.toStopId)
      .set('date', params.date);

    if (params.page != null) httpParams = httpParams.set('page', params.page);
    if (params.pageSize != null) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDir) httpParams = httpParams.set('sortDir', params.sortDir);

    return this.http.get<PagedResult<ScheduleResponse>>(`${this.base}/search`, { params: httpParams });
  }

  /**
   * POST /api/Schedules/by-keys
   * Create schedule using operator identity + busCode + routeCode, with either
   * departureUtc OR (departureLocal + timeZoneId).
   */
  createByKeys(body: {
    operatorUsername?: string;
    companyName?: string;
    busCode: string;
    routeCode: string;
    departureUtc?: string;    // ISO UTC
    departureLocal?: string;  // ISO local
    timeZoneId?: string;      // e.g. 'Asia/Kolkata'
    basePrice: number;
  }): Observable<ScheduleResponse> {
    return this.http.post<ScheduleResponse>(`${this.base}/by-keys`, body);
  }

  /** PUT /api/Schedules/{id} */
  update(id: string, body: { busId: string; routeId: string; departureUtc: string; basePrice: number }): Observable<ScheduleResponse> {
    return this.http.put<ScheduleResponse>(`${this.base}/${id}`, body);
  }

  /** DELETE /api/Schedules/{id} */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /**
   * GET /api/Schedules/{busCode}/{departureUtc}/availability
   * Note: departureUtc must be an ISO UTC string the backend can parse.
   */
  getSeatAvailabilityByKeys(busCode: string, departureUtc: string): Observable<SeatAvailabilityResponse> {
    return this.http.get<SeatAvailabilityResponse>(`${this.base}/${busCode}/${departureUtc}/availability`);
  }
}