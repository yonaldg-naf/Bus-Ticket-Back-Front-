import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminSummary {
  totalBuses: number;
  totalRoutes: number;
  totalSchedules: number;
  totalUsers: number;
  totalBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  recentActivity: { action: string; description: string; username?: string; createdAtUtc: string; isSuccess: boolean }[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/analytics`;

  getAdminSummary(): Observable<AdminSummary> {
    return this.http.get<AdminSummary>(`${this.base}/admin-summary`);
  }
}
