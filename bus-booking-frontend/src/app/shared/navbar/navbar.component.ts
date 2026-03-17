import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Sticky, minimal navbar -->
    <header class="navbar sticky top-0 z-50">
      <div class="container max-w-6xl h-[64px] flex items-center justify-between">
        <!-- Left: Logo -->
        <a routerLink="/" class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-[var(--text)] text-white flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 6h8a3 3 0 013 3v7a2 2 0 01-2 2v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H8v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1a2 2 0 01-2-2V9a3 3 0 013-3zM7 10h10M7 14h10M7 18h10"/>
            </svg>
          </div>
          <span class="font-extrabold tracking-tight">BusGo</span>
        </a>

        <!-- Center nav -->
        <nav class="hidden md:flex items-center gap-6">
          <a routerLink="/home" routerLinkActive="underline underline-offset-8">Home</a>
          <a routerLink="/search" routerLinkActive="underline underline-offset-8">Search</a>
          <a *ngIf="auth.isLoggedIn()" routerLink="/my-bookings" routerLinkActive="underline underline-offset-8">My bookings</a>
          <a *ngIf="auth.isOperator()" routerLink="/operator" routerLinkActive="underline underline-offset-8">Operator</a>
          <a *ngIf="auth.isAdmin()" routerLink="/admin" routerLinkActive="underline underline-offset-8">Admin</a>
        </nav>

        <!-- Right auth actions -->
        <div class="flex items-center gap-2">
          <ng-container *ngIf="auth.isLoggedIn(); else guest">
            <button class="btn btn-secondary h-9 px-3" (click)="logout()">Sign out</button>
          </ng-container>
          <ng-template #guest>
            <a routerLink="/auth/login" class="text-sm">Sign in</a>
            <a routerLink="/auth/register" class="btn btn-primary h-9 px-3">Get started</a>
          </ng-template>
        </div>
      </div>
    </header>
  `,
})
export class NavbarComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
