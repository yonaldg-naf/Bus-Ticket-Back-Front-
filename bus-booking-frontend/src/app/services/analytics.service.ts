import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DailyRevenue {
  date: string;
  revenue: number;
  bookings: number;
}

export interface RoutePerformance {
  routeCode: string;
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
}

export interface OperatorAnalytics {
  totalRevenue: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  averageOccupancyRate: number;
  averageRating: number;
  totalReviews: number;
  dailyRevenue: DailyRevenue[];
  topRoutes: RoutePerformance[];
}

export interface OperatorPerformance {
  operatorId: string;
  companyName: string;
  ownerName: string;
  totalBuses: number;
  totalRoutes: number;
  totalSchedules: number;
  totalBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  cancellationRate: number;
}

export interface AdminSummary {
  totalBuses: number;
  totalOperators: number;
  totalRoutes: number;
  totalSchedules: number;
  pendingApprovals: number;
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

  getOperatorAnalytics(days = 30): Observable<OperatorAnalytics> {
    const params = new HttpParams().set('days', days);
    return this.http.get<OperatorAnalytics>(`${this.base}/operator`, { params });
  }

  getAllOperatorPerformance(): Observable<OperatorPerformance[]> {
    return this.http.get<OperatorPerformance[]>(`${this.base}/operators`);
  }

  getAdminSummary(): Observable<AdminSummary> {
    return this.http.get<AdminSummary>(`${this.base}/admin-summary`);
  }
}
