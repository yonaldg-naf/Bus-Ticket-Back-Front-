import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export enum BookingStatus {
  Pending = 1,
  Confirmed = 2,
  Cancelled = 3,
  Refunded = 4,
}

export interface BookingPassengerDto {
  name: string;
  age?: number;
  seatNo: string;
}

export interface BookingResponse {
  id: string;
  userId: string;
  scheduleId: string;
  status: BookingStatus;
  totalAmount: number;
  createdAtUtc: string;
  updatedAtUtc?: string;
  busCode: string;
  registrationNumber: string;
  routeCode: string;
  departureUtc: string;
  busStatus: number;
  passengers: BookingPassengerDto[];
}

export interface CreateBookingRequest {
  scheduleId: string;
  passengers: BookingPassengerDto[];
}

export interface CreateBookingByKeysRequest {
  busCode: string;
  departureUtc: string; // ISO UTC
  passengers: BookingPassengerDto[];
}

export interface PayBookingRequest {
  amount: number;
  providerReference?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/bookings`;

  /** ScheduleId-based create (recommended to avoid DateTime equality issues) */
  create(dto: CreateBookingRequest): Observable<BookingResponse> {
    // Backend: POST /api/Bookings  (returns 201 Created)
    return this.http.post<BookingResponse>(`${this.base}`, dto);
  }

  /** By-keys create (sensitive to exact UTC equality) */
  createByKeys(dto: CreateBookingByKeysRequest): Observable<BookingResponse> {
    // Backend: POST /api/Bookings/by-keys
    return this.http.post<BookingResponse>(`${this.base}/by-keys`, dto);
  }

  getMyBookings(): Observable<BookingResponse[]> {
    return this.http.get<BookingResponse[]>(`${this.base}/my`);
  }

  getById(id: string): Observable<BookingResponse> {
    return this.http.get<BookingResponse>(`${this.base}/${id}`);
  }

  cancelPost(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/cancel`, {});
  }

  pay(id: string, dto: PayBookingRequest): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.base}/${id}/pay`, dto);
  }

  getOperatorStats(): Observable<{ totalBookings: number; confirmedBookings: number; revenue: number }> {
    return this.http.get<{ totalBookings: number; confirmedBookings: number; revenue: number }>(`${this.base}/operator-stats`);
  }
}