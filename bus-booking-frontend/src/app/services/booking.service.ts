import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BookingResponse, BookingStatus, BookingPassengerDto } from '../models/booking.models';

// Re-export so existing imports from this file still work
export { BookingResponse, BookingStatus, BookingPassengerDto };

export interface CreateBookingRequest {
  scheduleId: string;
  passengers: BookingPassengerDto[];
  promoCode?: string;
}

export interface CreateBookingByKeysRequest {
  busCode: string;
  departureUtc: string; // ISO UTC
  passengers: BookingPassengerDto[];
}

export interface PayBookingRequest {
  amount: number;
  providerReference?: string;
  useWallet?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/bookings`;

  create(dto: CreateBookingRequest): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.base}`, dto);
  }

  createByKeys(dto: CreateBookingByKeysRequest): Observable<BookingResponse> {
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

  getBySchedule(scheduleId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/schedule/${scheduleId}`);
  }

  busMiss(id: string): Observable<{ bookingId: string; status: string; originalAmount: number; refundAmount: number; message: string }> {
    return this.http.post<any>(`${this.base}/${id}/bus-miss`, {});
  }
}
