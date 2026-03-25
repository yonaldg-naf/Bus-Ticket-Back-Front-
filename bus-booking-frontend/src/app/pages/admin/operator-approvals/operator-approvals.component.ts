import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OperatorApprovalService, PendingOperator } from '../../../services/operator-approval.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-operator-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <!-- Top Bar -->
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <a routerLink="/admin" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-500 dark:text-slate-300 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 class="text-base font-bold text-slate-900 dark:text-white">Operator Approvals</h1>
            <p class="text-sm text-slate-500 mt-0.5">
              @if (pending().length > 0) {
                <span class="inline-flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  {{ pending().length }} pending review
                </span>
              } @else {
                All requests reviewed
              }
            </p>
          </div>
        </div>
        <button (click)="load()"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <svg class="w-4 h-4" [class.animate-spin]="loading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-6 py-6 space-y-4">

      <!-- Loading Skeleton -->
      @if (loading()) {
        <div class="space-y-4">
          @for (_ of [1,2,3]; track $index) {
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded w-40"></div>
                  <div class="h-3 bg-slate-100 dark:bg-slate-600 rounded w-56"></div>
                  <div class="h-3 bg-slate-100 dark:bg-slate-600 rounded w-32"></div>
                </div>
                <div class="flex gap-2">
                  <div class="h-9 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                  <div class="h-9 w-20 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && pending().length === 0) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center py-20 text-center">
          <div class="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 class="text-base font-semibold text-slate-800 dark:text-white">All clear</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">No pending operator requests at this time.</p>
        </div>
      }

      <!-- Pending List -->
      @for (op of pending(); track op.id) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">

          <!-- Main Row -->
          <div class="p-6 flex items-start justify-between gap-4 flex-wrap dark:bg-slate-800">
            <div class="flex items-start gap-4 flex-1 min-w-0">
              <div class="w-11 h-11 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-base flex-shrink-0">
                {{ op.fullName[0].toUpperCase() }}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <h3 class="font-semibold text-slate-900 dark:text-white">{{ op.fullName }}</h3>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Pending
                  </span>
                </div>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ op.email }}</p>
                <p class="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">{{ op.username }}</p>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-1.5">Applied {{ formatRelative(op.createdAtUtc) }}</p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-2 flex-shrink-0">
              <button (click)="openApprove(op)"
                class="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
                Approve
              </button>
              <button (click)="rejectUser(op)"
                class="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Reject
              </button>
            </div>
          </div>

          <!-- Approve Form (inline expand) -->
          @if (approvingId() === op.id) {
            <div class="border-t border-slate-100 dark:border-slate-700 px-6 py-5 bg-emerald-50/50 dark:bg-emerald-900/10">
              <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                Set operator details for <span class="text-emerald-700 font-semibold">{{ op.fullName }}</span>
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">Company Name *</label>
                  <input [(ngModel)]="approveForm.companyName" type="text" placeholder="e.g. Sharma Travels"
                    class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"/>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">Support Phone <span class="text-slate-400 font-normal normal-case">(optional)</span></label>
                  <input [(ngModel)]="approveForm.supportPhone" type="text" placeholder="+91 98765 43210"
                    class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"/>
                </div>
              </div>
              <div class="flex gap-3">
                <button (click)="confirmApprove(op)" [disabled]="!approveForm.companyName || saving()"
                  class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors">
                  {{ saving() ? 'Approving…' : 'Confirm Approval' }}
                </button>
                <button (click)="approvingId.set(null)"
                  class="px-5 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          }
        </div>
      }

    </div>
  </div>
  `,
})
export class OperatorApprovalsComponent implements OnInit {
  private svc   = inject(OperatorApprovalService);
  private toast = inject(ToastService);

  loading    = signal(true);
  saving     = signal(false);
  pending    = signal<PendingOperator[]>([]);
  approvingId = signal<string | null>(null);
  approveForm = { companyName: '', supportPhone: '' };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getPending().subscribe({
      next:  d  => { this.pending.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openApprove(op: PendingOperator) {
    this.approvingId.set(op.id);
    this.approveForm = { companyName: op.fullName + ' Travels', supportPhone: '' };
  }

  confirmApprove(op: PendingOperator) {
    if (!this.approveForm.companyName) return;
    this.saving.set(true);
    this.svc.approve(op.id, { companyName: this.approveForm.companyName, supportPhone: this.approveForm.supportPhone }).subscribe({
      next: () => {
        this.toast.success(`${op.fullName} approved as operator.`);
        this.approvingId.set(null);
        this.saving.set(false);
        this.load();
      },
      error: err => { this.saving.set(false); this.toast.error(err.error?.message ?? 'Approval failed.'); },
    });
  }

  rejectUser(op: PendingOperator) {
    if (!confirm(`Reject ${op.fullName}'s operator application? They will be set as a regular customer.`)) return;
    this.svc.reject(op.id).subscribe({
      next: () => { this.toast.success(`${op.fullName}'s request rejected.`); this.load(); },
      error: err => this.toast.error(err.error?.message ?? 'Rejection failed.'),
    });
  }

  formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
}
