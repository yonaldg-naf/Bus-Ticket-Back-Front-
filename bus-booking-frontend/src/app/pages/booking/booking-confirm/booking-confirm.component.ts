import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../../services/booking.service';
import { ToastService } from '../../../services/toast.service';
import { PromoCodeService, ValidatePromoResponse } from '../../../services/promo-code.service';
import { WalletService } from '../../../services/wallet.service';
import { BookingResponse, BookingStatus, BookingStatusLabels } from '../../../models/booking.models';

@Component({
  selector: 'app-booking-confirm',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <!-- Header -->
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <div>
          <h1 class="text-lg font-extrabold text-slate-900 dark:text-white">Booking Confirmation</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Review and complete your payment</p>
        </div>
        <!-- Steps -->
        <div class="flex items-center gap-2 mt-3">
          <div class="step-done">
            <span class="step-dot-done">✓</span>
            <span class="hidden sm:inline">Select Seats</span>
          </div>
          <div class="flex-1 h-0.5 bg-green-300 rounded"></div>
          <div class="step-done">
            <span class="step-dot-done">✓</span>
            <span class="hidden sm:inline">Passenger Details</span>
          </div>
          <div class="flex-1 h-0.5 bg-red-300 rounded"></div>
          <div class="step-active">
            <span class="step-dot-active">3</span>
            <span class="hidden sm:inline">Payment</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    @if (loading()) {
      <div class="flex items-center justify-center py-24 gap-3 text-slate-400 dark:text-slate-500">
        <svg class="animate-spin w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Loading booking…
      </div>
    }

    @if (!loading() && booking()) {
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        <!-- Success banner -->
        @if (booking()!.status === BookingStatus.Confirmed) {
          <div class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div>
              <p class="font-bold text-green-800 text-base">Booking Confirmed! 🎉</p>
              <p class="text-sm text-green-700 mt-0.5">Your ticket is booked. Have a great journey!</p>
            </div>
          </div>
        }

        <!-- Operator cancel banner -->
        @if (booking()!.status === BookingStatus.OperatorCancelled) {
          <div class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <div>
              <p class="font-semibold text-red-800">This trip was cancelled by the operator.</p>
              @if (booking()!.scheduleCancelReason) {
                <p class="text-sm text-red-700 mt-0.5">Reason: {{ booking()!.scheduleCancelReason }}</p>
              }
            </div>
          </div>
        }

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <!-- Left: Details -->
          <div class="lg:col-span-2 space-y-4">

            <!-- Booking details -->
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h2 class="font-semibold text-slate-800 dark:text-white">Booking Details</h2>
                <span class="badge" [class]="statusBadgeClass(booking()!.status)">
                  {{ statusLabel(booking()!.status) }}
                </span>
              </div>
              <div class="p-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide mb-0.5">Bus</p>
                  <p class="font-semibold text-slate-900 dark:text-white">{{ booking()!.busCode }}</p>
                  <p class="text-slate-400 dark:text-slate-500 text-xs font-mono">{{ booking()!.registrationNumber }}</p>
                </div>
                <div>
                  <p class="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide mb-0.5">Route</p>
                  <p class="font-semibold text-slate-900 dark:text-white">{{ booking()!.routeCode }}</p>
                </div>
                <div class="col-span-2">
                  <p class="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide mb-0.5">Departure</p>
                  <p class="font-semibold text-slate-900 dark:text-white">{{ formatDateTime(booking()!.departureUtc) }}</p>
                </div>
              </div>
            </div>

            <!-- Passengers -->
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h2 class="font-semibold text-slate-800 dark:text-white">Passengers</h2>
              </div>
              <div class="divide-y divide-slate-100 dark:divide-slate-700">
                @for (p of booking()!.passengers; track p.seatNo) {
                  <div class="px-5 py-3.5 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm">
                        {{ p.name[0].toUpperCase() }}
                      </div>
                      <div>
                        <p class="font-medium text-slate-900 dark:text-white text-sm">{{ p.name }}</p>
                        @if (p.age) { <p class="text-xs text-slate-400 dark:text-slate-500">Age {{ p.age }}</p> }
                      </div>
                    </div>
                    <span class="badge badge-info">💺 {{ p.seatNo }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Right: Payment -->
          <div class="space-y-4">
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 sticky top-20">
              <h2 class="font-semibold text-slate-800 dark:text-white mb-4">Payment Summary</h2>

              <!-- Promo Code (only for pending) -->
              @if (booking()!.status === BookingStatus.Pending) {
                <div class="mb-4">
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Promo Code</label>
                  <div class="flex gap-2">
                    <input [(ngModel)]="promoInput" placeholder="Enter code" [disabled]="!!promoResult()"
                      class="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 uppercase disabled:bg-slate-50 dark:disabled:bg-slate-600 disabled:text-slate-400"/>
                    @if (!promoResult()) {
                      <button (click)="applyPromo()" [disabled]="promoLoading() || !promoInput"
                        class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50">
                        Apply
                      </button>
                    } @else {
                      <button (click)="removePromo()" class="px-3 py-2 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        Remove
                      </button>
                    }
                  </div>
                  @if (promoResult()) {
                    <p class="text-xs text-green-600 font-semibold mt-1.5">✅ {{ promoResult()!.message ?? 'Discount applied!' }}</p>
                  }
                  @if (promoError()) {
                    <p class="text-xs text-red-500 mt-1.5">{{ promoError() }}</p>
                  }
                </div>
              }

              <div class="space-y-2 text-sm mb-5">
                <div class="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>{{ booking()!.passengers.length }} passenger{{ booking()!.passengers.length !== 1 ? 's' : '' }}</span>
                  <span>₹{{ (booking()!.totalAmount + booking()!.discountAmount) | number:'1.0-0' }}</span>
                </div>
                @if (booking()!.discountAmount > 0) {
                  <div class="flex justify-between text-green-600 font-medium">
                    <span>Discount ({{ booking()!.promoCode }})</span>
                    <span>-₹{{ booking()!.discountAmount | number:'1.0-0' }}</span>
                  </div>
                }
                <div class="flex justify-between font-bold text-slate-900 dark:text-white text-xl pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span>Total</span>
                  <span class="text-red-600">₹{{ finalAmount() | number:'1.0-0' }}</span>
                </div>
              </div>

              <!-- Pay button -->
              @if (booking()!.status === BookingStatus.Pending) {
                <button (click)="processPayment()" [disabled]="payLoading()"
                  class="btn-primary w-full py-3.5 text-base mb-2">
                  @if (payLoading()) {
                    <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Processing…
                  } @else {
                    🔒 Pay ₹{{ finalAmount() | number:'1.0-0' }}
                  }
                </button>

                <!-- Wallet pay button -->
                <div class="border border-slate-200 dark:border-slate-600 rounded-xl p-3 mb-3">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">💳 Wallet Balance</span>
                    <span class="text-sm font-bold" [class]="walletBalance() >= finalAmount() ? 'text-green-600' : 'text-red-500'">
                      ₹{{ walletBalance() | number:'1.0-2' }}
                    </span>
                  </div>
                  <button (click)="processWalletPayment()" [disabled]="payLoading() || walletBalance() < finalAmount()"
                    class="w-full py-2.5 text-sm font-semibold rounded-xl transition-colors"
                    [class]="walletBalance() >= finalAmount()
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'">
                    @if (walletBalance() >= finalAmount()) {
                      ✅ Pay ₹{{ finalAmount() | number:'1.0-0' }} with Wallet
                    } @else {
                      Insufficient wallet balance
                    }
                  </button>
                  @if (walletBalance() < finalAmount()) {
                    <a routerLink="/wallet" class="block text-center text-xs text-red-600 hover:underline mt-1.5">Add money to wallet →</a>
                  }
                </div>
              }

              @if (booking()!.status === BookingStatus.Confirmed) {
                <div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center mb-3">
                  <p class="text-green-700 font-semibold text-sm">✅ Payment Complete</p>
                </div>
                <!-- E-Ticket Download -->
                <button (click)="downloadTicket()"
                  class="w-full py-2.5 text-sm font-semibold rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 mb-3">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  </svg>
                  Download E-Ticket
                </button>
              }

              <!-- Cancel -->
              @if (booking()!.status === BookingStatus.Pending || booking()!.status === BookingStatus.Confirmed) {
                @if (booking()!.status !== BookingStatus.OperatorCancelled) {
                  <button (click)="cancelBooking()"
                    class="w-full py-2.5 text-sm font-medium rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    Cancel Booking
                  </button>
                }
              }

              <!-- Security note -->
              <p class="text-xs text-slate-400 dark:text-slate-500 text-center mt-4 flex items-center justify-center gap-1">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                </svg>
                Secured & encrypted payment
              </p>
            </div>

            <!-- Navigation -->
            <div class="flex gap-3">
              <a routerLink="/my-bookings" class="btn-secondary flex-1 py-2.5 text-center text-sm">My Bookings</a>
              <a routerLink="/home" class="btn-primary flex-1 py-2.5 text-center text-sm">Book Another</a>
            </div>
          </div>
        </div>
      </div>
    }
  </div>
  `,
})
export class BookingConfirmComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private bookingSvc = inject(BookingService);
  private toast      = inject(ToastService);
  private promoSvc   = inject(PromoCodeService);
  private walletSvc  = inject(WalletService);

  BookingStatus = BookingStatus;
  loading     = signal(true);
  payLoading  = signal(false);
  promoLoading = signal(false);
  booking     = signal<BookingResponse | null>(null);
  promoResult = signal<ValidatePromoResponse | null>(null);
  promoError  = signal('');
  promoInput  = '';
  walletBalance = signal(0);

  finalAmount(): number {
    const b = this.booking();
    if (!b) return 0;
    // TotalAmount from backend already has discount applied
    return b.totalAmount;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('bookingId')!;
    this.bookingSvc.getById(id).subscribe({
      next:  b  => { this.booking.set(b); this.loading.set(false); },
      error: () => { this.toast.error('Booking not found.'); this.router.navigate(['/my-bookings']); },
    });
    // Load wallet balance
    this.walletSvc.get().subscribe({ next: w => this.walletBalance.set(w.balance), error: () => {} });
  }

  applyPromo() {
    if (!this.promoInput || !this.booking()) return;
    this.promoLoading.set(true);
    this.promoError.set('');
    this.promoSvc.validate(this.promoInput.toUpperCase(), this.booking()!.totalAmount).subscribe({
      next: r => {
        this.promoLoading.set(false);
        if (r.isValid) { this.promoResult.set(r); }
        else { this.promoError.set(r.message ?? 'Invalid promo code.'); }
      },
      error: err => { this.promoLoading.set(false); this.promoError.set(err.error?.message ?? 'Invalid promo code.'); },
    });
  }

  removePromo() { this.promoResult.set(null); this.promoError.set(''); this.promoInput = ''; }

  downloadTicket() {
    const b = this.booking();
    if (!b) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const seats = b.passengers.map(p => p.seatNo).join(', ');
    const names = b.passengers.map(p => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${p.name}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${p.age ?? '—'}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-weight:700">${p.seatNo}</td></tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>SwiftRoute E-Ticket</title>
    <style>body{font-family:Arial,sans-serif;margin:0;padding:24px;background:#f8fafc;color:#1e293b}
    .ticket{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
    .header{background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;padding:24px 28px}
    .header h1{margin:0;font-size:24px;font-weight:900;letter-spacing:-0.5px}
    .header p{margin:4px 0 0;opacity:.8;font-size:13px}
    .body{padding:24px 28px}
    .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
    .label{color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
    .value{font-weight:700;color:#0f172a}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
    th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:.5px}
    .footer{background:#f8fafc;padding:16px 28px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0}
    .badge{display:inline-block;background:#dcfce7;color:#16a34a;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700}
    @media print{body{padding:0}.ticket{box-shadow:none;border-radius:0}}</style></head><body>
    <div class="ticket">
      <div class="header">
        <h1>🚌 SwiftRoute</h1>
        <p>E-Ticket · Booking #${b.id.slice(0, 8).toUpperCase()}</p>
      </div>
      <div class="body">
        <div class="row"><span class="label">Status</span><span class="badge">✅ Confirmed</span></div>
        <div class="row"><span class="label">Bus</span><span class="value">${b.busCode} · ${b.registrationNumber}</span></div>
        <div class="row"><span class="label">Route</span><span class="value">${b.routeCode}</span></div>
        <div class="row"><span class="label">Departure</span><span class="value">${new Date(b.departureUtc).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
        <div class="row"><span class="label">Seats</span><span class="value">${seats}</span></div>
        <div class="row"><span class="label">Total Paid</span><span class="value" style="color:#dc2626;font-size:18px">₹${b.totalAmount.toLocaleString('en-IN')}</span></div>
        <h3 style="margin:20px 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.5px">Passengers</h3>
        <table><thead><tr><th>Name</th><th>Age</th><th>Seat</th></tr></thead><tbody>${names}</tbody></table>
      </div>
      <div class="footer">Generated by SwiftRoute · ${new Date().toLocaleString('en-IN')} · Have a safe journey! 🙏</div>
    </div>
    <script>window.onload=()=>{window.print();}<\/script></body></html>`);
    win.document.close();
  }

  statusBadgeClass(s: BookingStatus): string {
    const map: Record<number, string> = {
      [BookingStatus.Pending]:           'badge badge-warning',
      [BookingStatus.Confirmed]:         'badge badge-success',
      [BookingStatus.Cancelled]:         'badge badge-error',
      [BookingStatus.OperatorCancelled]: 'badge badge-error',
      [BookingStatus.Refunded]:          'badge badge-gray',
    };
    return map[s] ?? 'badge badge-gray';
  }

  statusLabel(s: BookingStatus): string { return BookingStatusLabels[s] ?? 'Unknown'; }

  formatDateTime(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  processPayment() {
    if (!this.booking()) return;
    this.payLoading.set(true);
    this.bookingSvc.pay(this.booking()!.id, {
      amount: this.finalAmount(),
      providerReference: `PAY-${Date.now()}`,
      useWallet: false,
    }).subscribe({
      next:  b  => { this.booking.set(b); this.payLoading.set(false); this.toast.success('Payment successful! 🎉'); },
      error: err => { this.payLoading.set(false); this.toast.error(err.error?.message ?? 'Payment failed.'); },
    });
  }

  processWalletPayment() {
    if (!this.booking()) return;
    if (this.walletBalance() < this.finalAmount()) {
      this.toast.error(`Insufficient wallet balance. You have ₹${this.walletBalance().toFixed(0)}, need ₹${this.finalAmount().toFixed(0)}.`);
      return;
    }
    this.payLoading.set(true);
    this.bookingSvc.pay(this.booking()!.id, {
      amount: this.finalAmount(),
      providerReference: 'WALLET',
      useWallet: true,
    }).subscribe({
      next: b => {
        this.booking.set(b);
        this.walletBalance.update(bal => bal - this.finalAmount());
        this.payLoading.set(false);
        this.toast.success('Paid with wallet! 🎉');
      },
      error: err => { this.payLoading.set(false); this.toast.error(err.error?.message ?? 'Wallet payment failed.'); },
    });
  }

  cancelBooking() {
    if (!this.booking() || !confirm('Cancel this booking?')) return;
    this.bookingSvc.cancelPost(this.booking()!.id).subscribe({
      next:  () => { this.toast.success('Booking cancelled.'); this.router.navigate(['/my-bookings']); },
      error: err => this.toast.error(err.error?.message ?? 'Cancellation failed.'),
    });
  }
}