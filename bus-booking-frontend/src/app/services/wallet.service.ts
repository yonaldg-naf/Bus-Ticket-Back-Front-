import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WalletTransaction {
  id: string;
  type: 'Credit' | 'Debit';
  amount: number;
  balanceAfter: number;
  reason: string;
  bookingId?: string;
  description?: string;
  createdAtUtc: string;
}

export interface WalletResponse {
  balance: number;
  transactions: WalletTransaction[];
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/wallet`;

  get(): Observable<WalletResponse> {
    return this.http.get<WalletResponse>(this.base);
  }

  topUp(amount: number): Observable<{ balance: number; message: string }> {
    return this.http.post<{ balance: number; message: string }>(`${this.base}/topup`, { amount });
  }
}
