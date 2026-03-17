import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-lg mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-slate-800 mb-6">My Profile</h1>

      @if (auth.currentUser(); as user) {
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <!-- Avatar header -->
          <div class="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-8 text-center">
            <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span class="text-white text-3xl font-bold">{{ user.fullName ? user.fullName[0].toUpperCase() : '?' }}</span>
            </div>
            <h2 class="text-xl font-bold text-white">{{ user.fullName }}</h2>
            <span class="inline-block mt-2 px-3 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full">
              {{ user.role }}
            </span>
          </div>

          <div class="p-6 space-y-4">
            <div class="flex justify-between items-center py-3 border-b border-slate-100">
              <span class="text-sm text-slate-500">Username</span>
              <span class="font-medium text-slate-800">{{ user.username }}</span>
            </div>
            <div class="flex justify-between items-center py-3 border-b border-slate-100">
              <span class="text-sm text-slate-500">Email</span>
              <span class="font-medium text-slate-800">{{ user.email }}</span>
            </div>
            <div class="flex justify-between items-center py-3">
              <span class="text-sm text-slate-500">Session expires</span>
              <span class="text-sm text-slate-600">{{ formatExpiry(user.expiresAtUtc) }}</span>
            </div>
          </div>

          <div class="px-6 pb-6 flex gap-3">
            <a routerLink="/my-bookings"
              class="flex-1 text-center py-3 border border-slate-200 rounded-xl text-sm font-medium
                     text-slate-700 hover:bg-slate-50 transition-colors">
              My Bookings
            </a>
            <button (click)="auth.logout()"
              class="flex-1 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium
                     hover:bg-red-100 transition-colors">
              Sign Out
            </button>
          </div>
        </div>
      }
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
}
