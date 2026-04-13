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
  fullName: string;
}

export type UserRole = 'Customer' | 'Admin';

export interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface CurrentUser {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
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
  isCustomer = computed(() => this.role() === 'Customer');

  private base = `${environment.apiUrl}/auth`;

  // ============================
  // LOGIN
  // ============================
  login(dto: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, dto).pipe(
      tap((res) => {
        this.saveSession(res);

        if (res.role === 'Admin') this.router.navigate(['/admin']);
        else this.router.navigate(['/home']);
      })
    );
  }

  // ============================
  // REGISTER (THIS WAS MISSING!)
  // ============================
  register(dto: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, dto).pipe(
      tap((res) => this.saveSession(res))
    );
  }

  // ============================
  // FORGOT PASSWORD
  // ============================
  forgotPassword(email: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/forgot-password`, { email, newPassword });
  }

  // ============================
  // LOGOUT
  // ============================
  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this._currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  // TOKEN GETTER
  getToken(): string | null {
    return this._currentUser()?.token ?? null;
  }

  // ============================
  // TOKEN EXPIRY CHECK
  // ============================
  isTokenExpired(): boolean {
    const u = this._currentUser();
    if (!u) return true;
    return new Date(u.expiresAtUtc).getTime() <= Date.now();
  }

  // ============================
  // SAVE SESSION
  // ============================
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

  // ============================
  // LOAD SESSION
  // ============================
  private loadFromStorage(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  }
}