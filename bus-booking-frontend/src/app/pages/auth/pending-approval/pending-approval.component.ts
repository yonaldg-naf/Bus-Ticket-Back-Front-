import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-pending-approval',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md text-center">

      <!-- Icon -->
      <div class="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-100">
        <svg class="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>

      <h1 class="text-2xl font-extrabold text-gray-900 mb-2">Application Under Review</h1>
      <p class="text-gray-500 text-sm leading-relaxed mb-8">
        Your operator account has been created and is pending admin approval.
        You'll receive access to the operator dashboard once an admin reviews your application.
      </p>

      <!-- Status card -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 text-left space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">Account Created</p>
            <p class="text-xs text-gray-400">Logged in as <span class="font-mono font-semibold">{{ user()?.username }}</span></p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">Pending Admin Approval</p>
            <p class="text-xs text-gray-400">Usually reviewed within 24 hours</p>
          </div>
        </div>
        <div class="flex items-center gap-3 opacity-40">
          <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-gray-800">Operator Access Granted</p>
            <p class="text-xs text-gray-400">Manage buses, routes and schedules</p>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <a routerLink="/home"
          class="block w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl transition-colors shadow-lg shadow-red-200 text-sm">
          Browse as Customer
        </a>
        <button (click)="logout()"
          class="block w-full py-3 border border-gray-200 text-gray-600 font-medium rounded-2xl hover:bg-gray-50 transition-colors text-sm">
          Log Out
        </button>
      </div>

      <p class="text-xs text-gray-400 mt-6">
        Questions? Contact support at
        <a href="mailto:support@busgo.in" class="text-red-600 hover:underline">support@busgo.in</a>
      </p>
    </div>
  </div>
  `,
})
export class PendingApprovalComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  user = this.auth.currentUser;

  logout() { this.auth.logout(); }
}
