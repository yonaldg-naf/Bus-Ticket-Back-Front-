import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  createdAtUtc: string;
}

export interface UserListResult {
  total: number;
  page: number;
  pageSize: number;
  items: AdminUser[];
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth/users`;

  getUsers(params: { role?: string; search?: string; page?: number; pageSize?: number }): Observable<UserListResult> {
    let p = new HttpParams();
    if (params.role)     p = p.set('role', params.role);
    if (params.search)   p = p.set('search', params.search);
    if (params.page)     p = p.set('page', params.page);
    if (params.pageSize) p = p.set('pageSize', params.pageSize);
    return this.http.get<UserListResult>(this.base, { params: p });
  }
}