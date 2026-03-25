import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PromoCodeResponse {
  id: string;
  code: string;
  discountType: number; // 1=Flat, 2=Percentage
  discountValue: number;
  minBookingAmount?: number;
  maxDiscountAmount?: number;
  expiresAtUtc: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  companyName: string;
  createdAtUtc: string;
}

export interface CreatePromoCodeRequest {
  code: string;
  discountType: number;
  discountValue: number;
  minBookingAmount?: number;
  maxDiscountAmount?: number;
  expiresAtUtc: string;
  maxUses: number;
}

export interface ValidatePromoResponse {
  isValid: boolean;
  message?: string;
  code: string;
  discountAmount: number;
  finalAmount: number;
}

@Injectable({ providedIn: 'root' })
export class PromoCodeService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/promocodes`;

  create(dto: CreatePromoCodeRequest): Observable<PromoCodeResponse> {
    return this.http.post<PromoCodeResponse>(this.base, dto);
  }

  getMy(): Observable<PromoCodeResponse[]> {
    return this.http.get<PromoCodeResponse[]>(`${this.base}/my`);
  }

  toggle(id: string): Observable<PromoCodeResponse> {
    return this.http.patch<PromoCodeResponse>(`${this.base}/${id}/toggle`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  validate(code: string, bookingAmount: number): Observable<ValidatePromoResponse> {
    return this.http.post<ValidatePromoResponse>(`${this.base}/validate`, { code, bookingAmount });
  }
}
