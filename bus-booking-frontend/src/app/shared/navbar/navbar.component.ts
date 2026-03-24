import { Component, inject, signal, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        <!-- Logo -->
        <a routerLink="/home" class="flex items-center gap-2.5 flex-shrink-0 group">
          <div class="w-9 h-9 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-md shadow-red-200 group-hover:shadow-red-300 transition-shadow">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM4 11V9l1-4h14l1 4v2H4z"/>
            </svg>
          </div>
          <div class="leading-none">
            <span class="text-lg font-extrabold text-gray-900 tracking-tight">BusGo</span>
            <span class="block text-[9px] text-red-500 font-bold uppercase tracking-[0.15em] mt-0.5">Bus Booking</span>
          </div>
        </a>

        <!-- Nav links -->
        <nav class="hidden md:flex items-center gap-0.5">
          <a routerLink="/home" routerLinkActive="text-red-600 bg-red-50 font-semibold"
            [routerLinkActiveOptions]="{exact:true}"
            class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">Home</a>
          @if (auth.isLoggedIn()) {
            <a routerLink="/my-bookings" routerLinkActive="text-red-600 bg-red-50 font-semibold"
              class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">My Bookings</a>
          }
          @if (auth.isOperator()) {
            <a routerLink="/operator" routerLinkActive="text-red-600 bg-red-50 font-semibold"
              class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">Operator</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="text-red-600 bg-red-50 font-semibold"
              class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">Admin</a>
          }
        </nav>

        <!-- Right actions -->
        <div class="flex items-center gap-2">
          @if (auth.isLoggedIn()) {
            <div class="relative">
              <button (click)="dropOpen.update(v => !v)"
                class="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-red-200 hover:bg-red-50/50 transition-all">
                <div class="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {{ auth.currentUser()?.fullName?.[0]?.toUpperCase() ?? 'U' }}
                </div>
                <span class="text-sm font-medium text-gray-800 hidden sm:block max-w-[100px] truncate">{{ auth.currentUser()?.fullName }}</span>
                <svg class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200" [class.rotate-180]="dropOpen()"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              @if (dropOpen()) {
                <div class="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden z-50">
                  <div class="px-4 py-3.5 bg-gradient-to-br from-red-50 to-orange-50 border-b border-gray-100">
                    <p class="text-sm font-bold text-gray-900 truncate">{{ auth.currentUser()?.fullName }}</p>
                    <p class="text-xs text-gray-500 truncate mt-0.5">{{ auth.currentUser()?.email }}</p>
                    <span class="inline-block mt-2 text-xs px-2.5 py-0.5 rounded-full font-semibold"
                      [class]="auth.isAdmin() ? 'bg-purple-100 text-purple-700' : auth.isOperator() ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'">
                      {{ auth.currentUser()?.role }}
                    </span>
                  </div>
                  <div class="py-1.5">
                    <a routerLink="/profile" (click)="dropOpen.set(false)"
                      class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <div class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                      </div>
                      My Profile
                    </a>
                    <a routerLink="/my-bookings" (click)="dropOpen.set(false)"
                      class="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <div class="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                      </div>
                      My Bookings
                    </a>
                    <div class="my-1.5 border-t border-gray-100"></div>
                    <button (click)="logout()"
                      class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                      <div class="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                        <svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                      </div>
                      Sign Out
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <a routerLink="/auth/login"
              class="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
              Log In
            </a>
            <a routerLink="/auth/register"
              class="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-sm shadow-red-200 hover:shadow-red-300">
              Sign Up
            </a>
          }
        </div>
      </div>
    </header>

    <!-- Pending Operator Banner -->
    @if (auth.currentUser()?.role === 'PendingOperator') {
      <div class="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 px-4 py-2.5">
        <div class="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm text-orange-700">
          <span class="text-base">⏳</span>
          <strong>Operator approval pending.</strong>
          <span class="hidden sm:inline">Admin will review your request shortly. Full access granted once approved.</span>
        </div>
      </div>
    }
  `,
})
export class NavbarComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  dropOpen = signal(false);

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('button,a,div.relative')) this.dropOpen.set(false);
  }

  logout() { this.dropOpen.set(false); this.auth.logout(); }
}