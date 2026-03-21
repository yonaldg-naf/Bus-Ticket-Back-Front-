import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from './auth.service';

const MOCK: AuthResponse = {
  accessToken: 'test-token-abc',
  expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
  userId: '00000000-0000-0000-0000-000000000001',
  username: 'admin', email: 'admin@test.com', role: 'Admin', fullName: 'Test Admin',
};

describe('AuthService', () => {
  let svc: AuthService;
  let http: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: router }],
    });
    svc  = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });
  afterEach(() => http.verify());

  it('should create', () => expect(svc).toBeTruthy());
  it('isLoggedIn should be false initially', () => expect(svc.isLoggedIn()).toBeFalse());
  it('currentUser should be null initially',  () => expect(svc.currentUser()).toBeNull());

  it('login() should POST and store session', () => {
    svc.login({ username: 'admin', password: 'x' }).subscribe();
    http.expectOne(r => r.url.includes('/auth/login')).flush(MOCK);
    expect(svc.isLoggedIn()).toBeTrue();
    expect(svc.getToken()).toBe('test-token-abc');
  });

  it('login() Admin → navigate /admin', () => {
    svc.login({ username: 'admin', password: 'x' }).subscribe();
    http.expectOne(r => r.url.includes('/auth/login')).flush(MOCK);
    expect(router.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('login() Operator → navigate /operator', () => {
    svc.login({ username: 'op', password: 'x' }).subscribe();
    http.expectOne(r => r.url.includes('/auth/login')).flush({ ...MOCK, role: 'Operator' });
    expect(router.navigate).toHaveBeenCalledWith(['/operator']);
  });

  it('login() Customer → navigate /home', () => {
    svc.login({ username: 'c', password: 'x' }).subscribe();
    http.expectOne(r => r.url.includes('/auth/login')).flush({ ...MOCK, role: 'Customer' });
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('login() persists to localStorage', () => {
    svc.login({ username: 'admin', password: 'x' }).subscribe();
    http.expectOne(r => r.url.includes('/auth/login')).flush(MOCK);
    expect(JSON.parse(localStorage.getItem('bus_booking_user')!).username).toBe('admin');
  });

  it('register() should POST and save session', () => {
    svc.register({ username: 'new', email: 'n@t.com', password: 'P@ss1', role: 'Customer', fullName: 'New' }).subscribe();
    const req = http.expectOne(r => r.url.includes('/auth/register'));
    expect(req.request.method).toBe('POST');
    req.flush({ ...MOCK, username: 'new', role: 'Customer' });
    expect(svc.isLoggedIn()).toBeTrue();
  });

  it('logout() clears session and navigates to /auth/login', () => {
    svc.login({ username: 'admin', password: 'x' }).subscribe();
    http.expectOne(r => r.url.includes('/auth/login')).flush(MOCK);
    svc.logout();
    expect(svc.isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('bus_booking_user')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('isTokenExpired() true when no user', () => expect(svc.isTokenExpired()).toBeTrue());

  it('isTokenExpired() false for fresh token', () => {
    svc.login({ username: 'admin', password: 'x' }).subscribe();
    http.expectOne(r => r.url.includes('/auth/login')).flush(MOCK);
    expect(svc.isTokenExpired()).toBeFalse();
  });

  it('isTokenExpired() true for expired token', () => {
    svc.login({ username: 'admin', password: 'x' }).subscribe();
    http.expectOne(r => r.url.includes('/auth/login')).flush({ ...MOCK, expiresAtUtc: new Date(Date.now() - 1000).toISOString() });
    expect(svc.isTokenExpired()).toBeTrue();
  });

  it('isAdmin true after Admin login', () => {
    svc.login({ username: 'a', password: 'x' }).subscribe();
    http.expectOne(r => r.url.includes('/auth/login')).flush(MOCK);
    expect(svc.isAdmin()).toBeTrue();
    expect(svc.isOperator()).toBeFalse();
    expect(svc.isCustomer()).toBeFalse();
  });
});