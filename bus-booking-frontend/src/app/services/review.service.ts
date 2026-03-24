import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReviewResponse {
  id: string;
  bookingId: string;
  scheduleId: string;
  userFullName: string;
  rating: number;
  comment?: string;
  createdAtUtc: string;
  busCode: string;
  routeCode: string;
}

export interface RatingSummary {
  scheduleId: string;
  averageRating: number;
  totalReviews: number;
  starCounts: number[]; // index 0 = 1 star
}

export interface CreateReviewRequest {
  bookingId: string;
  rating: number;
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/reviews`;

  create(dto: CreateReviewRequest): Observable<ReviewResponse> {
    return this.http.post<ReviewResponse>(this.base, dto);
  }

  getBySchedule(scheduleId: string): Observable<ReviewResponse[]> {
    return this.http.get<ReviewResponse[]>(`${this.base}/schedule/${scheduleId}`);
  }

  getSummary(scheduleId: string): Observable<RatingSummary> {
    return this.http.get<RatingSummary>(`${this.base}/schedule/${scheduleId}/summary`);
  }

  getMyReview(bookingId: string): Observable<ReviewResponse> {
    return this.http.get<ReviewResponse>(`${this.base}/my/${bookingId}`);
  }
}
