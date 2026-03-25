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

    <!-- Header -->
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
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

    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      @if (auth.currentUser(); as user) {

        <!-- Avatar card -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="bg-slate-900 dark:bg-slate-950 px-6 py-8 text-center relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
            <div class="absolute inset-0 opacity-5 pointer-events-none">
              <div class="absolute -top-10 -right-10 w-40 h-40 rounded-full border-[30px] border-white"></div>
              <div class="absolute -bottom-10 -left-10 w-56 h-56 rounded-full border-[40px] border-white"></div>
            </div>
            <div class="relative z-10">
              <div class="w-20 h-20 bg-red-600 border-4 border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-900/50">
                <span class="text-white text-3xl font-extrabold">{{ user.fullName[0]?.toUpperCase() ?? '?' }}</span>
              </div>
              <h2 class="text-xl font-bold text-white">{{ user.fullName }}</h2>
              <span class="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold"
                [class]="roleBadgeClass(user.role)">
                {{ roleLabel(user.role) }}
              </span>
            </div>
          </div>

          <!-- Details -->
          <div class="divide-y divide-slate-100 dark:divide-slate-700">
            <div class="px-6 py-4 flex items-center justify-between">
              <span class="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                Username
              </span>
              <span class="font-semibold text-slate-800 dark:text-white font-mono text-sm">{{ user.username }}</span>
            </div>
            <div class="px-6 py-4 flex items-center justify-between">
              <span class="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                Email
              </span>
              <span class="font-semibold text-slate-800 dark:text-white text-sm">{{ user.email }}</span>
            </div>
            @if (user.companyName) {
              <div class="px-6 py-4 flex items-center justify-between">
                <span class="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                  Company
                </span>
                <span class="font-semibold text-slate-800 dark:text-white text-sm">{{ user.companyName }}</span>
              </div>
            }
            <div class="px-6 py-4 flex items-center justify-between">
              <span class="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                Session expires
              </span>
              <span class="text-sm text-slate-600 dark:text-slate-300">{{ formatExpiry(user.expiresAtUtc) }}</span>
            </div>
          </div>
        </div>

        <!-- Pending operator notice -->
        @if (user.role === 'PendingOperator') {
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div>
              <p class="font-semibold text-slate-800 dark:text-white text-sm">Operator Approval Pending</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Your operator registration is awaiting admin approval. You'll receive full access once approved.</p>
            </div>
          </div>
        }

        <!-- Actions -->
        <div class="flex gap-3">
          @if (user.role === 'Customer' || user.role === 'PendingOperator') {
            <a routerLink="/my-bookings" class="flex-1 py-3 text-center text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              My Bookings
            </a>
          }
          @if (user.role === 'Operator') {
            <a routerLink="/operator" class="flex-1 py-3 text-center text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Operator Panel
            </a>
          }
          @if (user.role === 'Admin') {
            <a routerLink="/admin" class="flex-1 py-3 text-center text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Admin Panel
            </a>
          }
          <button (click)="auth.logout()"
            class="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-red-200 dark:shadow-red-900/30">
            Sign Out
          </button>
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
      Admin: '🛡️ Administrator', Operator: '🚌 Bus Operator',
      Customer: '🧳 Traveller', PendingOperator: '⏳ Pending Operator',
    };
    return map[role] ?? role;
  }

  roleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      Admin:           'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      Operator:        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      Customer:        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      PendingOperator: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    };
    return map[role] ?? 'bg-slate-100 text-slate-700';
  }
}
