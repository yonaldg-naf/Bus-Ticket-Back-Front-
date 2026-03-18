import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Navbar -->
    <header class="sticky top-0 z-50 backdrop-blur-xl bg-[#0f0f10]/80 border-b border-[#1f1f22]">

      <div class="max-w-6xl mx-auto h-[64px] px-6 flex items-center justify-between">

        <!-- Logo -->
        <a routerLink="/" class="flex items-center gap-3 group">
          <div class="w-9 h-9 rounded-xl 
                      bg-gradient-to-br from-[#D32F2F] to-[#7f1d1d]
                      flex items-center justify-center shadow-md
                      group-hover:scale-105 transition">

            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 6h8a3 3 0 013 3v7a2 2 0 01-2 2v1a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H8v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1a2 2 0 01-2-2V9a3 3 0 013-3zM7 10h10M7 14h10M7 18h10"/>
            </svg>
          </div>

          <span class="text-white font-semibold tracking-tight text-lg">
            SwiftRoute
          </span>
        </a>

        <!-- Center Nav -->
        <nav class="hidden md:flex items-center gap-8 text-sm">

          <a routerLink="/home"
             routerLinkActive="text-white"
             class="text-gray-400 hover:text-white transition">
            Home
          </a>

          <a routerLink="/search"
             routerLinkActive="text-white"
             class="text-gray-400 hover:text-white transition">
            Search
          </a>

          <a *ngIf="auth.isLoggedIn()"
             routerLink="/my-bookings"
             routerLinkActive="text-white"
             class="text-gray-400 hover:text-white transition">
            My bookings
          </a>

          <a *ngIf="auth.isOperator()"
             routerLink="/operator"
             routerLinkActive="text-white"
             class="text-gray-400 hover:text-white transition">
            Operator
          </a>

          <a *ngIf="auth.isAdmin()"
             routerLink="/admin"
             routerLinkActive="text-white"
             class="text-gray-400 hover:text-white transition">
            Admin
          </a>

        </nav>

        <!-- Right -->
        <div class="flex items-center gap-3">

          <ng-container *ngIf="auth.isLoggedIn(); else guest">

            <button
              (click)="logout()"
              class="px-4 py-2 text-sm rounded-lg
                     bg-[#1a1a1d] border border-[#2a2a2d]
                     text-gray-300 hover:text-white hover:border-[#D32F2F]
                     transition">
              Sign out
            </button>

          </ng-container>

          <ng-template #guest>

            <a routerLink="/auth/login"
               class="text-sm text-gray-400 hover:text-white transition">
              Sign in
            </a>

            <a routerLink="/auth/register"
               class="px-4 py-2 text-sm rounded-lg text-white
                      bg-gradient-to-r from-[#D32F2F] to-[#7f1d1d]
                      hover:opacity-90 transition shadow-md">
              Get started
            </a>

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