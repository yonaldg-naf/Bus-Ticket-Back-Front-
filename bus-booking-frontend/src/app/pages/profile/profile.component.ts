import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <a routerLink="/home" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-500 dark:text-slate-300 hover:text-red-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <div>
          <h1 class="text-base font-bold text-slate-900 dark:text-white">My Profile</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400">Your account information</p>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      @if (auth.currentUser(); as user) {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Left: avatar + actions -->
          <div class="lg:col-span-1 space-y-4">
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div class="bg-slate-900 dark:bg-slate-950 px-6 py-8 text-center relative overflow-hidden">
                <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
                <div class="relative z-10">
                  <div class="w-20 h-20 bg-red-600 border-4 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-900/50">
                    <span class="text-white text-3xl font-extrabold">{{ user.fullName[0]?.toUpperCase() ?? '?' }}</span>
                  </div>
                  <h2 class="text-xl font-bold text-white">{{ user.fullName }}</h2>
                  <span class="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold" [class]="roleBadgeClass(user.role)">
                    {{ roleLabel(user.role) }}
                  </span>
                </div>
              </div>
              <div class="divide-y divide-slate-100 dark:divide-slate-700">
                <div class="px-6 py-4 flex items-center justify-between">
                  <span class="text-sm text-slate-500 dark:text-slate-400">Username</span>
                  <span class="font-semibold text-slate-800 dark:text-white font-mono text-sm">{{ user.username }}</span>
                </div>
                <div class="px-6 py-4 flex items-center justify-between">
                  <span class="text-sm text-slate-500 dark:text-slate-400">Email</span>
                  <span class="font-semibold text-slate-800 dark:text-white text-sm">{{ user.email }}</span>
                </div>
                <div class="px-6 py-4 flex items-center justify-between">
                  <span class="text-sm text-slate-500 dark:text-slate-400">Session expires</span>
                  <span class="text-sm text-slate-600 dark:text-slate-300">{{ formatExpiry(user.expiresAtUtc) }}</span>
                </div>
              </div>
            </div>


            <div class="flex gap-3">
              @if (user.role === 'Customer') {
                <a routerLink="/my-bookings" class="flex-1 py-3 text-center text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  My Bookings
                </a>
              }
              @if (user.role === 'Admin') {
                <a routerLink="/admin" class="flex-1 py-3 text-center text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Admin Panel
                </a>
              }
              <button (click)="auth.logout()" class="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-red-200 dark:shadow-red-900/30">
                Sign Out
              </button>
            </div>
          </div>

          <!-- Right: account details -->
          <div class="lg:col-span-2 space-y-4">
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
              <h2 class="font-bold text-slate-800 dark:text-white mb-1">Account Details</h2>
              <p class="text-xs text-slate-400 dark:text-slate-500 mb-5">Your registered information</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <p class="text-xs text-slate-400 uppercase tracking-wide mb-1">Full Name</p>
                  <p class="font-semibold text-slate-800 dark:text-white">{{ user.fullName }}</p>
                </div>
                <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <p class="text-xs text-slate-400 uppercase tracking-wide mb-1">Username</p>
                  <p class="font-semibold text-slate-800 dark:text-white font-mono">{{ user.username }}</p>
                </div>
                <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <p class="text-xs text-slate-400 uppercase tracking-wide mb-1">Email</p>
                  <p class="font-semibold text-slate-800 dark:text-white">{{ user.email }}</p>
                </div>
                <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <p class="text-xs text-slate-400 uppercase tracking-wide mb-1">Role</p>
                  <p class="font-semibold text-slate-800 dark:text-white">{{ roleLabel(user.role) }}</p>
                </div>
                <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl sm:col-span-2">
                  <p class="text-xs text-slate-400 uppercase tracking-wide mb-1">Session Expires</p>
                  <p class="font-semibold text-slate-800 dark:text-white">{{ formatExpiry(user.expiresAtUtc) }}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      }
    </div>
  </div>
  `,
})
export class ProfileComponent {
  auth = inject(AuthService);

  formatExpiry(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      Admin:    '🛡️ Administrator',
      Customer: '🧳 Traveller',
    };
    return map[role] ?? role;
  }

  roleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      Admin:    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      Customer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };
    return map[role] ?? 'bg-slate-100 text-slate-700';
  }
}
