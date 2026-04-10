import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { AuthService, AuthResponse, CurrentUser } from './auth.service';

const STORAGE_KEY = 'bus_booking_user';

const mockAuthResponse: AuthResponse = {
  accessToken: 'test.jwt.token',
  expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
  userId: 'user-001',
  username: 'testuser',
  email: 'test@example.com',
  role: 'Customer',
  fullName: 'Test User',
};

const mockCurrentUser: CurrentUser = {
  userId: 'user-001',
  username: 'testuser',
  email: 'test@example.com',
  role: 'Customer',
  fullName: 'Test User',
  token: 'test.jwt.token',
  expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let router: Router;

  function setup(storedUser?: CurrentUser | null) {
    localStorage.clear();
    if (storedUser) localStorage.setItem(STORAGE_KEY, JSON.stringify(storedUser));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule.withRoutes([])],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  }

  beforeEach(() => setup());
  afterEach(() => { http.verify(); localStorage.clear(); });

  // ── Creation ─────────────────────────────────────────────────
  it('should be created', () => expect(service).toBeTruthy());

  // ── Initial state — no user ──────────────────────────────────
  describe('when no user in storage', () => {
    it('currentUser() returns null', () => expect(service.currentUser()).toBeNull());
    it('isLoggedIn() returns false', () => expect(service.isLoggedIn()).toBeFalse());
    it('role() returns null', () => expect(service.role()).toBeNull());
    it('isAdmin() returns false', () => expect(service.isAdmin()).toBeFalse());
    it('isCustomer() returns false', () => expect(service.isCustomer()).toBeFalse());
    it('getToken() returns null', () => expect(service.getToken()).toBeNull());
    it('isTokenExpired() returns true', () => expect(service.isTokenExpired()).toBeTrue());
  });

  // ── Loaded from storage ──────────────────────────────────────
  describe('when valid user in storage', () => {
    beforeEach(() => setup(mockCurrentUser));

    it('currentUser() is populated', () => expect(service.currentUser()?.username).toBe('testuser'));
    it('isLoggedIn() returns true', () => expect(service.isLoggedIn()).toBeTrue());
    it('role() returns Customer', () => expect(service.role()).toBe('Customer'));
    it('isCustomer() returns true', () => expect(service.isCustomer()).toBeTrue());
    it('isAdmin() returns false', () => expect(service.isAdmin()).toBeFalse());
    it('getToken() returns stored token', () => expect(service.getToken()).toBe('test.jwt.token'));
    it('isTokenExpired() returns false for fresh token', () => expect(service.isTokenExpired()).toBeFalse());
  });

  // ── Expired token in storage ─────────────────────────────────
  describe('when token is expired', () => {
    beforeEach(() => setup({
      ...mockCurrentUser,
      expiresAtUtc: new Date(Date.now() - 1000).toISOString(),
    }));

    it('isTokenExpired() returns true', () => expect(service.isTokenExpired()).toBeTrue());
  });

  // ── Admin role ────────────────────────────────────────────────
  describe('when role is Admin', () => {
    beforeEach(() => setup({ ...mockCurrentUser, role: 'Admin' }));
    it('isAdmin() returns true', () => expect(service.isAdmin()).toBeTrue());
    it('isCustomer() returns false', () => expect(service.isCustomer()).toBeFalse());
  });

  // ── login() ──────────────────────────────────────────────────
  describe('login()', () => {
    it('POSTs to /api/auth/login', () => {
      service.login({ username: 'u', password: 'p' }).subscribe();
      const req = http.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'u', password: 'p' });
      req.flush(mockAuthResponse);
    });

    it('saves token to localStorage', () => {
      service.login({ username: 'u', password: 'p' }).subscribe();
      http.expectOne('/api/auth/login').flush(mockAuthResponse);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.token).toBe('test.jwt.token');
      expect(stored.username).toBe('testuser');
    });

    it('updates currentUser signal', () => {
      service.login({ username: 'u', password: 'p' }).subscribe();
      http.expectOne('/api/auth/login').flush(mockAuthResponse);
      expect(service.currentUser()?.username).toBe('testuser');
      expect(service.isLoggedIn()).toBeTrue();
    });

    it('navigates to /admin for Admin role', () => {
      service.login({ username: 'a', password: 'p' }).subscribe();
      http.expectOne('/api/auth/login').flush({ ...mockAuthResponse, role: 'Admin' });
      expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('navigates to /home for Customer role', () => {
      service.login({ username: 'c', password: 'p' }).subscribe();
      http.expectOne('/api/auth/login').flush({ ...mockAuthResponse, role: 'Customer' });
      expect(router.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  // ── register() ───────────────────────────────────────────────
  describe('register()', () => {
    it('POSTs to /api/auth/register', () => {
      service.register({ username: 'u', email: 'e@e.com', password: 'p', fullName: 'U' }).subscribe();
      const req = http.expectOne('/api/auth/register');
      expect(req.request.method).toBe('POST');
      req.flush(mockAuthResponse);
    });

    it('saves session after register', () => {
      service.register({ username: 'u', email: 'e@e.com', password: 'p', fullName: 'U' }).subscribe();
      http.expectOne('/api/auth/register').flush(mockAuthResponse);
      expect(service.currentUser()?.username).toBe('testuser');
    });
  });

  // ── logout() ─────────────────────────────────────────────────
  describe('logout()', () => {
    beforeEach(() => setup(mockCurrentUser));

    it('clears currentUser signal', () => {
      service.logout();
      expect(service.currentUser()).toBeNull();
      expect(service.isLoggedIn()).toBeFalse();
    });

    it('removes token from localStorage', () => {
      service.logout();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('navigates to /auth/login', () => {
      service.logout();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('role() returns null after logout', () => {
      service.logout();
      expect(service.role()).toBeNull();
    });
  });
});