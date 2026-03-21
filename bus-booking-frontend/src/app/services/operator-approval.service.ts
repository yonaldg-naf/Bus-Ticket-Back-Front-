import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PendingOperator {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  createdAtUtc: string;
}

export interface ApproveDto {
  companyName?: string;
  supportPhone?: string;
}

@Injectable({ providedIn: 'root' })
export class OperatorApprovalService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/operator-approvals`;

  getPending(): Observable<PendingOperator[]> {
    return this.http.get<PendingOperator[]>(this.base);
  }

  approve(id: string, dto: ApproveDto): Observable<any> {
    return this.http.post(`${this.base}/${id}/approve`, dto);
  }

  reject(id: string): Observable<any> {
    return this.http.post(`${this.base}/${id}/reject`, {});
  }
}