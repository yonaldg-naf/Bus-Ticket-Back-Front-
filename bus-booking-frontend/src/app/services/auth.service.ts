import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  username: string;
  password: string;
}
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: 'Customer' | 'Operator' | 'Admin';
  fullName: string;
}
export interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  userId: string;
  username: string;
  email: string;
  role: 'Customer' | 'Operator' | 'Admin';
  fullName: string;
}
export interface CurrentUser {
  userId: string;
  username: string;
  email: string;
  role: 'Customer' | 'Operator' | 'Admin';
  fullName: string;
  token: string;
  expiresAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly STORAGE_KEY = 'bus_booking_user';

  private _currentUser = signal<CurrentUser | null>(this.loadFromStorage());
  currentUser = this._currentUser.asReadonly();

  isLoggedIn = computed(() => !!this._currentUser());
  role = computed(() => this._currentUser()?.role ?? null);
  isAdmin = computed(() => this.role() === 'Admin');
  isOperator = computed(() => this.role() === 'Operator');
  isCustomer = computed(() => this.role() === 'Customer');

  private base = `${environment.apiUrl}/auth`;

  login(dto: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, dto).pipe(
  tap((res) => {
    this.saveSession(res);

    // --- Role-based redirect (fix) ---
    if (res.role === 'Admin') {
      this.router.navigate(['/admin']);
    } else if (res.role === 'Operator') {
      this.router.navigate(['/operator']);
    } else {
      this.router.navigate(['/home']);
    }
  })
);

  }

  register(dto: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, dto).pipe(
      tap((res) => this.saveSession(res))
    );
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this._currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return this._currentUser()?.token ?? null;
  }

  isTokenExpired(): boolean {
    const u = this._currentUser();
    if (!u) return true;
    return new Date(u.expiresAtUtc).getTime() <= Date.now();
  }

  private saveSession(res: AuthResponse): void {
    const user: CurrentUser = {
      userId: res.userId,
      username: res.username,
      email: res.email,
      role: res.role,
      fullName: res.fullName,
      token: res.accessToken,
      expiresAtUtc: res.expiresAtUtc,
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    this._currentUser.set(user);
  }

  private loadFromStorage(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as CurrentUser;
      if (new Date(data.expiresAtUtc).getTime() <= Date.now()) {
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }
}