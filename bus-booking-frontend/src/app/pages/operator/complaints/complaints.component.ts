import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ComplaintService, ComplaintResponse } from '../../../services/complaint.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <a routerLink="/operator" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-500 dark:text-slate-300 hover:text-red-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <div>
          <h1 class="text-base font-bold text-slate-900 dark:text-white">Customer Complaints</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400">View and respond to complaints from your passengers</p>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">

      <!-- Filter tabs -->
      <div class="flex gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 w-fit shadow-sm">
        @for (tab of tabs; track tab) {
          <button (click)="activeFilter.set(tab)"
            class="px-4 py-1.5 rounded-xl text-sm font-semibold transition-all"
            [class]="activeFilter() === tab
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'">
            {{ tab }}
            @if (tab === 'Open') {
              <span class="ml-1 text-xs">({{ openCount() }})</span>
            }
          </button>
        }
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-16 gap-3 text-slate-400">
          <svg class="animate-spin w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Loading complaints…
        </div>
      } @else if (filtered().length === 0) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center text-slate-400">
          <p class="text-4xl mb-3">💬</p>
          <p class="font-medium text-slate-500 dark:text-slate-400">No {{ activeFilter().toLowerCase() }} complaints</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (c of filtered(); track c.id) {
            <div class="bg-white dark:bg-slate-800 rounded-2xl border shadow-sm overflow-hidden"
              [class]="c.status === 'Open' ? 'border-orange-200 dark:border-orange-800' : 'border-slate-200 dark:border-slate-700'">

              <!-- Header -->
              <div class="px-5 py-3.5 border-b flex items-center justify-between gap-3 flex-wrap"
                [class]="c.status === 'Open' ? 'border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10' : 'border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30'">
                <div class="flex items-center gap-3 flex-wrap">
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full"
                    [class]="c.status === 'Open'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'">
                    {{ c.status }}
                  </span>
                  <span class="text-sm font-semibold text-slate-800 dark:text-white">{{ c.customerName }}</span>
                  <span class="text-xs text-slate-400 font-mono">{{ c.busCode }} · {{ c.routeCode }}</span>
                </div>
                <span class="text-xs text-slate-400">{{ formatDate(c.createdAtUtc) }}</span>
              </div>

              <!-- Message -->
              <div class="px-5 py-4">
                <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{{ c.message }}</p>

                <!-- Existing reply -->
                @if (c.reply) {
                  <div class="mt-3 pl-3 border-l-2 border-green-400">
                    <p class="text-xs font-semibold text-green-700 dark:text-green-400 mb-0.5">Your Reply</p>
                    <p class="text-sm text-slate-600 dark:text-slate-300">{{ c.reply }}</p>
                  </div>
                }

                <!-- Reply form -->
                @if (replyingId() === c.id) {
                  <div class="mt-3 space-y-2">
                    <textarea [(ngModel)]="replyText" rows="3" placeholder="Type your reply..."
                      class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none transition-colors">
                    </textarea>
                    <div class="flex gap-2">
                      <button (click)="submitReply(c.id)" [disabled]="submittingReply() || !replyText.trim()"
                        class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                        {{ submittingReply() ? 'Sending…' : 'Send Reply' }}
                      </button>
                      <button (click)="replyingId.set(null); replyText = ''"
                        class="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                } @else if (c.status === 'Open') {
                  <button (click)="replyingId.set(c.id); replyText = ''"
                    class="mt-3 flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                    </svg>
                    Reply & Resolve
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  </div>
  `,
})
export class ComplaintsComponent implements OnInit {
  private complaintSvc = inject(ComplaintService);
  private toast        = inject(ToastService);

  loading       = signal(true);
  complaints    = signal<ComplaintResponse[]>([]);
  activeFilter  = signal<string>('All');
  replyingId    = signal<string | null>(null);
  submittingReply = signal(false);
  replyText     = '';

  tabs = ['All', 'Open', 'Resolved'];

  openCount = () => this.complaints().filter(c => c.status === 'Open').length;

  filtered = () => {
    const f = this.activeFilter();
    const all = this.complaints();
    if (f === 'Open')     return all.filter(c => c.status === 'Open');
    if (f === 'Resolved') return all.filter(c => c.status === 'Resolved');
    return all;
  };

  ngOnInit() {
    this.complaintSvc.getAll().subscribe({
      next: d => { this.complaints.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Failed to load complaints.'); },
    });
  }

  submitReply(id: string) {
    if (!this.replyText.trim()) return;
    this.submittingReply.set(true);
    this.complaintSvc.reply(id, this.replyText.trim()).subscribe({
      next: updated => {
        this.complaints.update(list => list.map(c => c.id === updated.id ? updated : c));
        this.replyingId.set(null);
        this.replyText = '';
        this.submittingReply.set(false);
        this.toast.success('Reply sent. Complaint marked as resolved.');
      },
      error: err => {
        this.submittingReply.set(false);
        this.toast.error(err.error?.message ?? 'Failed to send reply.');
      }
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
