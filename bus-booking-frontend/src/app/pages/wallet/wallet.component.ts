import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WalletService, WalletTransaction } from '../../services/wallet.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <!-- Header -->
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
        <a routerLink="/home" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-500 dark:text-slate-300 hover:text-red-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <div>
          <h1 class="text-lg font-bold text-slate-900 dark:text-white">My Wallet</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Manage your balance and transactions</p>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: balance + top-up -->
        <div class="lg:col-span-1 space-y-5">

      <!-- Balance card -->
      <div class="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-6 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30">
        <p class="text-red-200 text-sm font-medium mb-1">Available Balance</p>
        <p class="text-4xl font-extrabold tracking-tight">
          ₹{{ balance() | number:'1.0-2' }}
        </p>
        <p class="text-red-200 text-xs mt-2">Use this balance to pay for bookings instantly</p>
      </div>

      <!-- Top-up card -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <h2 class="font-semibold text-slate-800 dark:text-white mb-4">Add Money</h2>

        <!-- Quick amounts -->
        <div class="flex gap-2 flex-wrap mb-4">
          @for (amt of quickAmounts; track amt) {
            <button (click)="topUpAmount = amt"
              class="px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
              [class]="topUpAmount === amt
                ? 'bg-red-600 text-white border-red-600'
                : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-red-300 hover:text-red-600'">
              ₹{{ amt }}
            </button>
          }
        </div>

        <div class="flex gap-3">
          <input [(ngModel)]="topUpAmount" type="number" min="1" max="50000" placeholder="Enter amount"
            class="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
          <button (click)="doTopUp()" [disabled]="toppingUp() || !topUpAmount || topUpAmount < 1"
            class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap">
            {{ toppingUp() ? 'Adding…' : 'Add Money' }}
          </button>
        </div>
      </div>
        </div>

        <!-- Right: transactions -->
        <div class="lg:col-span-2">
      <!-- Transactions -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 class="font-semibold text-slate-800 dark:text-white">Transaction History</h2>
          <span class="text-xs text-slate-400">Last 50</span>
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-12 gap-3 text-slate-400">
            <svg class="animate-spin w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Loading…
          </div>
        } @else if (transactions().length === 0) {
          <div class="text-center py-12 text-slate-400 dark:text-slate-500">
            <p class="text-3xl mb-2">💳</p>
            <p class="text-sm">No transactions yet. Add money to get started.</p>
          </div>
        } @else {
          <div class="divide-y divide-slate-50 dark:divide-slate-700">
            @for (tx of transactions(); track tx.id) {
              <div class="px-5 py-4 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    [class]="tx.type === 'Credit' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'">
                    {{ tx.type === 'Credit' ? '↓' : '↑' }}
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-slate-800 dark:text-white">{{ reasonLabel(tx.reason) }}</p>
                    @if (tx.description) {
                      <p class="text-xs text-slate-400 dark:text-slate-500">{{ tx.description }}</p>
                    }
                    <p class="text-xs text-slate-400 dark:text-slate-500">{{ formatDate(tx.createdAtUtc) }}</p>
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="font-bold text-base" [class]="tx.type === 'Credit' ? 'text-green-600' : 'text-red-600'">
                    {{ tx.type === 'Credit' ? '+' : '-' }}₹{{ tx.amount | number:'1.0-2' }}
                  </p>
                  <p class="text-xs text-slate-400">Bal: ₹{{ tx.balanceAfter | number:'1.0-2' }}</p>
                </div>
              </div>
            }
          </div>
        }
      </div>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class WalletComponent implements OnInit {
  private walletSvc = inject(WalletService);
  private toast     = inject(ToastService);

  loading    = signal(true);
  toppingUp  = signal(false);
  balance    = signal(0);
  transactions = signal<WalletTransaction[]>([]);
  topUpAmount: number | null = null;

  quickAmounts = [100, 250, 500, 1000, 2000];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.walletSvc.get().subscribe({
      next: d => {
        this.balance.set(d.balance);
        this.transactions.set(d.transactions);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast.error('Failed to load wallet.'); }
    });
  }

  doTopUp() {
    if (!this.topUpAmount || this.topUpAmount < 1) return;
    this.toppingUp.set(true);
    this.walletSvc.topUp(this.topUpAmount).subscribe({
      next: r => {
        this.balance.set(r.balance);
        this.toppingUp.set(false);
        this.topUpAmount = null;
        this.toast.success(r.message);
        this.load(); // refresh transactions
      },
      error: err => {
        this.toppingUp.set(false);
        this.toast.error(err.error?.message ?? 'Top-up failed.');
      }
    });
  }

  reasonLabel(reason: string): string {
    const map: Record<string, string> = {
      TopUp: 'Wallet Top-Up',
      BookingPayment: 'Booking Payment',
      CancellationRefund: 'Cancellation Refund',
      AdminCancelRefund: 'Admin Cancellation Refund',
    };
    return map[reason] ?? reason;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

