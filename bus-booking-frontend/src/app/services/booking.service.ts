import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BookingResponse, BookingStatus, BookingPassengerDto, PayBookingRequest } from '../models/booking.models';

// Re-export so existing imports from this file still work
export { BookingResponse, BookingStatus, BookingPassengerDto, PayBookingRequest };

export interface CreateBookingRequest {
  scheduleId: string;
  passengers: BookingPassengerDto[];
  promoCode?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/bookings`;

  create(dto: CreateBookingRequest): Observable<BookingResponse> {
    return this.http.post<BookingResponse>(`${this.base}`, dto);
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
}
