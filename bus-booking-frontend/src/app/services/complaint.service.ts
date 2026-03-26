import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ComplaintResponse {
  id: string;
  bookingId: string;
  userId: string;
  customerName: string;
  message: string;
  reply?: string;
  status: string; // 'Open' | 'Resolved'
  busCode: string;
  routeCode: string;
  departureUtc: string;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

@Injectable({ providedIn: 'root' })
export class ComplaintService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/complaints`;

  raise(bookingId: string, message: string): Observable<ComplaintResponse> {
    return this.http.post<ComplaintResponse>(`${this.base}/booking/${bookingId}`, { message });
  }

  getMy(): Observable<ComplaintResponse[]> {
    return this.http.get<ComplaintResponse[]>(`${this.base}/my`);
  }

  // Operator / Admin
  getAll(): Observable<ComplaintResponse[]> {
    return this.http.get<ComplaintResponse[]>(`${this.base}`);
  }

  reply(id: string, replyText: string): Observable<ComplaintResponse> {
    return this.http.patch<ComplaintResponse>(`${this.base}/${id}/reply`, { reply: replyText });
  }
}
