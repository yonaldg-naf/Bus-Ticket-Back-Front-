import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Redirects to /auth/login if user is not authenticated */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && !auth.isTokenExpired()) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};

/** Redirects to /home if user is already authenticated (for login/register pages) */
export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // If not logged in → allow access to login/register
  if (!auth.isLoggedIn() || auth.isTokenExpired()) {
    return true;
  }

  // If logged in → redirect based on role
  const role = auth.role();

  if (role === 'Admin') {
    return router.createUrlTree(['/admin']);
  }

  if (role === 'Operator') {
    return router.createUrlTree(['/operator']);
  }

  return router.createUrlTree(['/home']);
};

/** Factory guard for role-based access */
export function roleGuard(...allowedRoles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const role = auth.role();
    if (role && allowedRoles.includes(role)) {
      return true;
    }

    // Not authenticated at all
    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/auth/login']);
    }

    // Authenticated but wrong role
    return router.createUrlTree(['/home']);
  };
}