import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../../services/booking.service';
import { ToastService } from '../../../services/toast.service';
import { BookingResponse, BookingStatus, BookingStatusLabels } from '../../../models/booking.models';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <!-- Header -->
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
        <button (click)="router.navigate(['/my-bookings'])"
          class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-500 dark:text-slate-300 hover:text-red-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 class="text-lg font-bold text-slate-900 dark:text-white">Booking Details</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400">Full ticket information</p>
        </div>
      </div>
    </div>

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
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        <!-- Admin cancel banner -->
        @if (booking()!.isScheduleCancelledByAdmin) {
          <div class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
            <div>
              <p class="font-semibold text-red-800">This trip was cancelled by the admin.</p>
              @if (booking()!.scheduleCancelReason) {
                <p class="text-sm text-red-700 mt-0.5">Reason: {{ booking()!.scheduleCancelReason }}</p>
              }
            </div>
          </div>
        }

        <!-- Ticket Card -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="bg-red-600 px-6 py-5">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-red-200 text-xs uppercase tracking-widest mb-0.5">Bus</p>
                <p class="text-white font-extrabold text-2xl">{{ booking()!.busCode }}</p>
                <p class="text-red-100 text-sm font-mono">{{ booking()!.registrationNumber }}</p>
              </div>
              <div class="text-right">
                <p class="text-red-200 text-xs uppercase tracking-widest mb-0.5">Route</p>
                <p class="text-white font-extrabold text-2xl">{{ booking()!.routeCode }}</p>
                <span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                  {{ statusLabel(booking()!.status) }}
                </span>
              </div>
            </div>
          </div>

          <div class="relative border-t-2 border-dashed border-slate-200 dark:border-slate-600 mx-6">
            <div class="absolute -left-9 -top-3.5 w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600"></div>
            <div class="absolute -right-9 -top-3.5 w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600"></div>
          </div>

          <div class="px-6 py-5 space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-slate-500 dark:text-slate-400">Booking Ref</span>
              <span class="font-mono font-semibold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">
                #{{ booking()!.id.slice(0,8).toUpperCase() }}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500 dark:text-slate-400">Status</span>
              <span class="badge" [class]="statusBadge(booking()!.status)">{{ statusLabel(booking()!.status) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500 dark:text-slate-400">Departure</span>
              <span class="font-semibold text-slate-800 dark:text-white">{{ formatDateTime(booking()!.departureUtc) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500 dark:text-slate-400">Booked on</span>
              <span class="text-slate-600 dark:text-slate-300">{{ formatDateTime(booking()!.createdAtUtc) }}</span>
            </div>
          </div>

          <div class="relative border-t-2 border-dashed border-slate-200 dark:border-slate-600 mx-6">
            <div class="absolute -left-9 -top-3.5 w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600"></div>
            <div class="absolute -right-9 -top-3.5 w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600"></div>
          </div>

          <div class="px-6 py-5">
            <p class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Passengers</p>
            <div class="space-y-2">
              @for (p of booking()!.passengers; track p.seatNo) {
                <div class="flex items-center justify-between py-2.5 px-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm flex-shrink-0">
                      {{ p.name[0].toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-semibold text-slate-900 dark:text-white text-sm">{{ p.name }}</p>
                      @if (p.age) { <p class="text-xs text-slate-400 dark:text-slate-500">Age {{ p.age }}</p> }
                    </div>
                  </div>
                  <span class="badge badge-info text-xs">Seat {{ p.seatNo }}</span>
                </div>
              }
            </div>
          </div>

          <div class="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span class="text-sm text-slate-500 dark:text-slate-400">Total Amount</span>
            <span class="text-2xl font-extrabold text-red-600">₹{{ booking()!.totalAmount | number:'1.0-0' }}</span>
          </div>
        </div>

        <!-- Refund Policy Card (only for confirmed bookings) -->
        @if (booking()!.status === BookingStatus.Confirmed && booking()!.refundPolicy) {
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
                </svg>
              </div>
              <div>
                <p class="font-semibold text-blue-800 text-sm">Cancellation Refund Policy</p>
                <p class="text-sm text-blue-700 mt-0.5">{{ booking()!.refundPolicy }}</p>
                @if ((booking()!.refundPercent ?? 0) > 0) {
                  <p class="text-sm font-bold text-blue-800 mt-1">
                    You'll receive ₹{{ booking()!.refundAmount | number:'1.0-0' }} ({{ booking()!.refundPercent }}% refund)
                  </p>
                } @else {
                  <p class="text-sm font-bold text-red-700 mt-1">No refund available</p>
                }
              </div>
            </div>
          </div>
        }

        <!-- Action buttons -->
        <div class="space-y-3">
          @if ((booking()!.status === BookingStatus.Pending || booking()!.status === BookingStatus.Confirmed)
               && !booking()!.isScheduleCancelledByAdmin) {
            @if (!showCancelForm()) {
              <button (click)="showCancelForm.set(true)"
                class="w-full py-3 text-sm font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                Cancel Booking
              </button>
            } @else {
              <div class="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                <p class="text-sm font-semibold text-red-800">Why are you cancelling?</p>
                <div class="grid grid-cols-2 gap-2">
                  @for (reason of cancelReasons; track reason) {
                    <label class="flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-sm"
                      [class]="cancelReason === reason
                        ? 'border-red-500 bg-red-100 text-red-700 font-medium'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-red-300'">
                      <input type="radio" [(ngModel)]="cancelReason" [value]="reason" class="sr-only"/>
                      {{ reason }}
                    </label>
                  }
                </div>
                @if (booking()!.refundPolicy && (booking()!.refundPercent ?? 0) > 0) {
                  <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Refund: ₹{{ booking()!.refundAmount | number:'1.0-0' }} ({{ booking()!.refundPercent }}%) — {{ booking()!.refundPolicy }}
                  </div>
                }
                <div class="flex gap-2 pt-1">
                  <button (click)="cancelBooking()" [disabled]="cancelling() || !cancelReason"
                    class="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                    {{ cancelling() ? 'Cancelling…' : 'Confirm Cancel' }}
                  </button>
                  <button (click)="showCancelForm.set(false); cancelReason = ''"
                    class="flex-1 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Keep Booking
                  </button>
                </div>
              </div>
            }
          }

          <div class="flex gap-3">
            <a routerLink="/my-bookings"
              class="flex-1 py-3 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-center">
              ← All Bookings
            </a>
            <a routerLink="/home"
              class="flex-1 py-3 text-sm font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors text-center">
              Book Again
            </a>
          </div>
        </div>

      </div>
    }
  </div>
  `,
})
export class BookingDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  router             = inject(Router);
  private bookingSvc = inject(BookingService);
  private toast      = inject(ToastService);

  BookingStatus   = BookingStatus;
  loading         = signal(true);
  cancelling      = signal(false);
  booking         = signal<BookingResponse | null>(null);
  showCancelForm  = signal(false);
  cancelReason    = '';

  cancelReasons = ['Changed plans', 'Wrong date / time', 'Found better option', 'Emergency', 'Price too high', 'Other'];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bookingSvc.getById(id).subscribe({
      next: b => {
        this.booking.set(b);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast.error('Booking not found.'); this.router.navigate(['/my-bookings']); },
    });
  }

  cancelBooking() {
    this.cancelling.set(true);
    this.bookingSvc.cancelPost(this.booking()!.id).subscribe({
      next: () => { this.toast.success('Booking cancelled.'); this.router.navigate(['/my-bookings']); },
      error: err => { this.cancelling.set(false); this.toast.error(err.error?.message ?? 'Cancellation failed.'); },
    });
  }

  statusBadge(s: BookingStatus): string {
    const map: Record<number, string> = {
      [BookingStatus.Pending]:   'badge badge-warning',
      [BookingStatus.Confirmed]: 'badge badge-success',
      [BookingStatus.Cancelled]: 'badge badge-error',
    };
    return map[s] ?? 'badge badge-gray';
  }

  statusLabel(s: BookingStatus): string { return BookingStatusLabels[s] ?? 'Unknown'; }

  formatDateTime(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}

