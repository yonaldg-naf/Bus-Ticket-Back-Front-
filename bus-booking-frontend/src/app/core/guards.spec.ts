import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { authGuard, noAuthGuard, roleGuard } from './guards';
import { AuthService, CurrentUser } from '../services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

const STORAGE_KEY = 'bus_booking_user';

function makeUser(role: string, expired = false): CurrentUser {
  return {
    userId: 'u-001',
    username: 'testuser',
    email: 't@t.com',
    role: role as any,
    fullName: 'Test',
    token: 'tok',
    expiresAtUtc: expired
      ? new Date(Date.now() - 1000).toISOString()
      : new Date(Date.now() + 3_600_000).toISOString(),
  };
}

// ✅ FIXED: pass route + state
function runGuard(guard: any): any {
  return TestBed.runInInjectionContext(() =>
    guard({} as any, {} as any)
  );
}

// ✅ FIXED: pass route + state
function runRoleGuard(roles: string[]): any {
  return TestBed.runInInjectionContext(() =>
    roleGuard(...roles)({} as any, {} as any)
  );
}

describe('Guards', () => {
  let router: Router;

  function setup(user?: CurrentUser | null) {
    localStorage.clear();
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule.withRoutes([])],
      providers: [AuthService],
    });

    router = TestBed.inject(Router);
  }

  afterEach(() => localStorage.clear());

  // ══ authGuard ════════════════════════════════════════════════
  describe('authGuard', () => {
    it('returns true when user is logged in with valid token', () => {
      setup(makeUser('Customer'));
      expect(runGuard(authGuard)).toBeTrue();
    });

    it('redirects to /auth/login when not logged in', () => {
      setup(null);
      const result = runGuard(authGuard) as UrlTree;
      expect(result.toString()).toBe('/auth/login');
    });

    it('redirects to /auth/login when token is expired', () => {
      setup(makeUser('Customer', true));
      const result = runGuard(authGuard) as UrlTree;
      expect(result.toString()).toBe('/auth/login');
    });

    it('allows Admin through', () => {
      setup(makeUser('Admin'));
      expect(runGuard(authGuard)).toBeTrue();
    });

    it('allows Operator through', () => {
      setup(makeUser('Operator'));
      expect(runGuard(authGuard)).toBeTrue();
    });
  });

  // ══ noAuthGuard ══════════════════════════════════════════════
  describe('noAuthGuard', () => {
    it('returns true when no user is logged in', () => {
      setup(null);
      expect(runGuard(noAuthGuard)).toBeTrue();
    });

    it('returns true when token is expired', () => {
      setup(makeUser('Customer', true));
      expect(runGuard(noAuthGuard)).toBeTrue();
    });

    it('redirects Admin to /admin', () => {
      setup(makeUser('Admin'));
      const result = runGuard(noAuthGuard) as UrlTree;
      expect(result.toString()).toBe('/admin');
    });

    it('redirects Operator to /operator', () => {
      setup(makeUser('Operator'));
      const result = runGuard(noAuthGuard) as UrlTree;
      expect(result.toString()).toBe('/operator');
    });

    it('redirects Customer to /home', () => {
      setup(makeUser('Customer'));
      const result = runGuard(noAuthGuard) as UrlTree;
      expect(result.toString()).toBe('/home');
    });
  });

  // ══ roleGuard ════════════════════════════════════════════════
  describe('roleGuard', () => {
    it('allows access when user has the required role', () => {
      setup(makeUser('Admin'));
      expect(runRoleGuard(['Admin'])).toBeTrue();
    });

    it('allows access when user matches one of multiple allowed roles', () => {
      setup(makeUser('Operator'));
      expect(runRoleGuard(['Admin', 'Operator'])).toBeTrue();
    });

    it('redirects to /home when role does not match', () => {
      setup(makeUser('Customer'));
      const result = runRoleGuard(['Admin']) as UrlTree;
      expect(result.toString()).toBe('/home');
    });

    it('redirects to /auth/login when not logged in', () => {
      setup(null);
      const result = runRoleGuard(['Admin']) as UrlTree;
      expect(result.toString()).toBe('/auth/login');
    });

    it('blocks Customer from Admin-only routes', () => {
      setup(makeUser('Customer'));
      const result = runRoleGuard(['Admin']) as UrlTree;
      expect(result.toString()).toBe('/home');
    });
  });
});