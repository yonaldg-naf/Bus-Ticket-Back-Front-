import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard, noAuthGuard, roleGuard } from './guards';
import { AuthService } from '../services/auth.service';

const makeAuth = (loggedIn: boolean, role: string | null = null) => ({
  isLoggedIn: signal(loggedIn),
  role:       signal(role),
  isTokenExpired: () => !loggedIn,
});
const STATE = {} as RouterStateSnapshot;
const ROUTE = {} as ActivatedRouteSnapshot;

const makeRouter = () => {
  const r = jasmine.createSpyObj('Router', ['createUrlTree', 'parseUrl']);
  r.createUrlTree.and.callFake((cmds: string[]) => ({ toString: () => cmds.join('/') } as any));
  return r;
};

describe('authGuard', () => {
  it('returns true when logged in', () => {
    const router = makeRouter();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }, { provide: AuthService, useValue: makeAuth(true, 'Customer') }] });
    expect(TestBed.runInInjectionContext(() => authGuard(ROUTE, STATE))).toBeTrue();
  });

  it('redirects to /auth/login when not logged in', () => {
    const router = makeRouter();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }, { provide: AuthService, useValue: makeAuth(false) }] });
    TestBed.runInInjectionContext(() => authGuard(ROUTE, STATE));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });
});

describe('noAuthGuard', () => {
  it('returns true when not logged in', () => {
    const router = makeRouter();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }, { provide: AuthService, useValue: makeAuth(false) }] });
    expect(TestBed.runInInjectionContext(() => noAuthGuard(ROUTE, STATE))).toBeTrue();
  });

  it('redirects logged-in Admin to /admin', () => {
    const router = makeRouter();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }, { provide: AuthService, useValue: makeAuth(true, 'Admin') }] });
    TestBed.runInInjectionContext(() => noAuthGuard(ROUTE, STATE));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/admin']);
  });

  it('redirects logged-in Operator to /operator', () => {
    const router = makeRouter();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }, { provide: AuthService, useValue: makeAuth(true, 'Operator') }] });
    TestBed.runInInjectionContext(() => noAuthGuard(ROUTE, STATE));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/operator']);
  });

  it('redirects logged-in Customer to /home', () => {
    const router = makeRouter();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }, { provide: AuthService, useValue: makeAuth(true, 'Customer') }] });
    TestBed.runInInjectionContext(() => noAuthGuard(ROUTE, STATE));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/home']);
  });
});

describe('roleGuard', () => {
  it('allows access for matching role', () => {
    const router = makeRouter();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }, { provide: AuthService, useValue: makeAuth(true, 'Admin') }] });
    expect(TestBed.runInInjectionContext(() => roleGuard('Admin')(ROUTE, STATE))).toBeTrue();
  });

  it('allows access for one of multiple roles', () => {
    const router = makeRouter();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }, { provide: AuthService, useValue: makeAuth(true, 'Operator') }] });
    expect(TestBed.runInInjectionContext(() => roleGuard('Operator', 'Admin')(ROUTE, STATE))).toBeTrue();
  });

  it('denies access and redirects for wrong role', () => {
    const router = makeRouter();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }, { provide: AuthService, useValue: makeAuth(true, 'Customer') }] });
    TestBed.runInInjectionContext(() => roleGuard('Admin')(ROUTE, STATE));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/home']);
  });

  it('redirects to /auth/login when not logged in', () => {
    const router = makeRouter();
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }, { provide: AuthService, useValue: makeAuth(false) }] });
    TestBed.runInInjectionContext(() => roleGuard('Admin')(ROUTE, STATE));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });
});