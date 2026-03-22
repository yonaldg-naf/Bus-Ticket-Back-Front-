import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
  <div class="min-h-screen bg-gray-50">

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-2xl mx-auto px-4 sm:px-6 py-5">
        <h1 class="text-lg font-bold text-gray-900">My Profile</h1>
        <p class="text-sm text-gray-500 mt-0.5">Your account information</p>
      </div>
    </div>

    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      @if (auth.currentUser(); as user) {
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          <!-- Red header with avatar -->
          <div class="bg-red-600 px-6 py-8 text-center relative overflow-hidden">
            <div class="absolute inset-0 opacity-10">
              <div class="absolute -top-10 -right-10 w-40 h-40 rounded-full border-[30px] border-white"></div>
              <div class="absolute -bottom-10 -left-10 w-56 h-56 rounded-full border-[40px] border-white"></div>
            </div>
            <div class="relative z-10">
              <div class="w-20 h-20 bg-white/20 border-4 border-white/40 rounded-full flex items-center justify-center mx-auto mb-3">
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
          <div class="divide-y divide-gray-100">
            <div class="px-6 py-4 flex items-center justify-between">
              <span class="text-sm text-gray-500 flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                Username
              </span>
              <span class="font-semibold text-gray-800 font-mono">{{ user.username }}</span>
            </div>
            <div class="px-6 py-4 flex items-center justify-between">
              <span class="text-sm text-gray-500 flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                Email
              </span>
              <span class="font-semibold text-gray-800">{{ user.email }}</span>
            </div>
            @if (user.companyName) {
              <div class="px-6 py-4 flex items-center justify-between">
                <span class="text-sm text-gray-500 flex items-center gap-2">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                  Company
                </span>
                <span class="font-semibold text-gray-800">{{ user.companyName }}</span>
              </div>
            }
            <div class="px-6 py-4 flex items-center justify-between">
              <span class="text-sm text-gray-500 flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                Session expires
              </span>
              <span class="text-sm text-gray-600">{{ formatExpiry(user.expiresAtUtc) }}</span>
            </div>
          </div>

          <!-- Pending operator notice -->
          @if (user.role === 'PendingOperator') {
            <div class="mx-6 mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
              <span class="text-orange-500 text-xl flex-shrink-0">⏳</span>
              <div>
                <p class="font-semibold text-orange-800 text-sm">Operator Approval Pending</p>
                <p class="text-xs text-orange-700 mt-0.5">Your operator registration is awaiting admin approval. You'll receive full access once approved.</p>
              </div>
            </div>
          }

          <!-- Actions -->
          <div class="px-6 pb-6 flex gap-3">
            @if (user.role === 'Customer' || user.role === 'PendingOperator') {
              <a routerLink="/my-bookings" class="btn-secondary flex-1 py-3 text-center text-sm">My Bookings</a>
            }
            @if (user.role === 'Operator') {
              <a routerLink="/operator" class="btn-secondary flex-1 py-3 text-center text-sm">Operator Panel</a>
            }
            @if (user.role === 'Admin') {
              <a routerLink="/admin" class="btn-secondary flex-1 py-3 text-center text-sm">Admin Panel</a>
            }
            <button (click)="auth.logout()"
              class="flex-1 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
              Sign Out
            </button>
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
      Admin: '🛡️ Administrator', Operator: '🚌 Bus Operator',
      Customer: '🧳 Traveller', PendingOperator: '⏳ Pending Operator',
    };
    return map[role] ?? role;
  }

  roleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      Admin: 'bg-purple-100 text-purple-800', Operator: 'bg-blue-100 text-blue-800',
      Customer: 'bg-green-100 text-green-800', PendingOperator: 'bg-orange-100 text-orange-800',
    };
    return map[role] ?? 'bg-gray-100 text-gray-700';
  }
}