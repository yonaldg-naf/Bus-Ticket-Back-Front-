// src/app/core/guards.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// ------------------ AUTH GUARD ------------------
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && !auth.isTokenExpired()) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};

// ------------------ NO AUTH GUARD ------------------
export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn() || auth.isTokenExpired()) {
    return true;
  }

  const role = auth.role();

  if (role === 'Admin') return router.createUrlTree(['/admin']);
  if (role === 'Operator') return router.createUrlTree(['/operator']);
  if (role === 'PendingOperator') return router.createUrlTree(['/home']);

  return router.createUrlTree(['/home']);
};

// ------------------ ROLE GUARD ------------------
export function roleGuard(...allowedRoles: string[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const role = auth.role();
    if (role && allowedRoles.includes(role)) {
      return true;
    }

    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/auth/login']);
    }

    return router.createUrlTree(['/home']);
  };
}