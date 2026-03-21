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
  <div class="min-h-screen bg-gray-50">

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <a routerLink="/admin" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div class="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white text-base shadow-sm">🚌</div>
          <div>
            <h1 class="text-lg font-bold text-gray-900">Operator Approvals</h1>
            <p class="text-sm text-gray-500">Review and approve operator registration requests</p>
          </div>
        </div>
        <button (click)="load()"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
          <svg class="w-4 h-4" [class.animate-spin]="loading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">

      <!-- Loading -->
      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1,2,3]; track $index) {
            <div class="card p-5 animate-pulse">
              <div class="flex justify-between items-start">
                <div class="space-y-2"><div class="h-5 skeleton w-40 rounded"></div><div class="h-4 skeleton w-56 rounded"></div></div>
                <div class="flex gap-2"><div class="h-9 skeleton w-20 rounded-lg"></div><div class="h-9 skeleton w-20 rounded-lg"></div></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty -->
      @if (!loading() && pending().length === 0) {
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center text-4xl mb-4">✅</div>
          <h3 class="text-lg font-bold text-gray-800">All clear!</h3>
          <p class="text-gray-500 mt-1.5 text-sm">No pending operator requests right now.</p>
        </div>
      }

      <!-- Pending list -->
      @for (op of pending(); track op.id) {
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          <!-- Main row -->
          <div class="p-5 flex items-start justify-between gap-4 flex-wrap">
            <div class="flex items-start gap-4 flex-1 min-w-0">
              <div class="w-12 h-12 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700 font-bold text-lg flex-shrink-0">
                {{ op.fullName[0].toUpperCase() }}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-0.5">
                  <h3 class="font-bold text-gray-900">{{ op.fullName }}</h3>
                  <span class="badge badge-warning">⏳ Pending Approval</span>
                </div>
                <p class="text-sm text-gray-500">{{ op.email }}</p>
                <p class="text-xs text-gray-400 font-mono mt-0.5">@{{ op.username }}</p>
                <p class="text-xs text-gray-400 mt-1">Applied {{ formatRelative(op.createdAtUtc) }}</p>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex gap-2 flex-shrink-0">
              <button (click)="openApprove(op)"
                class="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
                Approve
              </button>
              <button (click)="rejectUser(op)"
                class="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Reject
              </button>
            </div>
          </div>

          <!-- Approve form (expands inline) -->
          @if (approvingId() === op.id) {
            <div class="border-t border-gray-100 px-5 py-4 bg-green-50">
              <p class="text-sm font-semibold text-gray-700 mb-3">Set operator details for <span class="text-green-700">{{ op.fullName }}</span></p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label class="form-label text-xs">Company Name *</label>
                  <input [(ngModel)]="approveForm.companyName" type="text" placeholder="e.g. Sharma Travels"
                    class="form-input text-sm py-2"/>
                </div>
                <div>
                  <label class="form-label text-xs">Support Phone <span class="text-gray-400 font-normal">(optional)</span></label>
                  <input [(ngModel)]="approveForm.supportPhone" type="text" placeholder="+91 98765 43210"
                    class="form-input text-sm py-2"/>
                </div>
              </div>
              <div class="flex gap-2">
                <button (click)="confirmApprove(op)" [disabled]="!approveForm.companyName || saving()"
                  class="btn-primary px-5 py-2 text-sm disabled:opacity-50">
                  {{ saving() ? 'Approving…' : '✓ Confirm Approval' }}
                </button>
                <button (click)="approvingId.set(null)" class="btn-secondary px-4 py-2 text-sm">Cancel</button>
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
        this.toast.success(`${op.fullName} approved as operator! ✅`);
        this.approvingId.set(null);
        this.saving.set(false);
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.toast.error(err.error?.message ?? 'Approval failed.');
      },
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