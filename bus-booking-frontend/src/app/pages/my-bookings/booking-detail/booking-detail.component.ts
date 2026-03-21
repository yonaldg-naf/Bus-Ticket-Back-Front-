import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../../services/booking.service';
import { ToastService } from '../../../services/toast.service';
import { BookingResponse, BookingStatus, BookingStatusLabels } from '../../../models/booking.models';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="min-h-screen bg-gray-50">

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
        <button (click)="router.navigate(['/my-bookings'])"
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 class="text-lg font-bold text-gray-900">Booking Details</h1>
          <p class="text-sm text-gray-500">Full ticket information</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    @if (loading()) {
      <div class="flex items-center justify-center py-24 gap-3 text-gray-400">
        <svg class="animate-spin w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Loading booking…
      </div>
    }

    @if (!loading() && booking()) {
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">

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

        <!-- Ticket Card -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          <!-- Ticket top header - red strip -->
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

          <!-- Dashed divider -->
          <div class="relative border-t-2 border-dashed border-gray-200 mx-6">
            <div class="absolute -left-9 -top-3.5 w-7 h-7 rounded-full bg-gray-50 border border-gray-200"></div>
            <div class="absolute -right-9 -top-3.5 w-7 h-7 rounded-full bg-gray-50 border border-gray-200"></div>
          </div>

          <!-- Ticket body -->
          <div class="px-6 py-5 space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Booking Ref</span>
              <span class="font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs">
                #{{ booking()!.id.slice(0,8).toUpperCase() }}
              </span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Status</span>
              <span class="badge" [class]="statusBadge(booking()!.status)">{{ statusLabel(booking()!.status) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Departure</span>
              <span class="font-semibold text-gray-800">{{ formatDateTime(booking()!.departureUtc) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Booked on</span>
              <span class="text-gray-600">{{ formatDateTime(booking()!.createdAtUtc) }}</span>
            </div>
          </div>

          <!-- Dashed divider 2 -->
          <div class="relative border-t-2 border-dashed border-gray-200 mx-6">
            <div class="absolute -left-9 -top-3.5 w-7 h-7 rounded-full bg-gray-50 border border-gray-200"></div>
            <div class="absolute -right-9 -top-3.5 w-7 h-7 rounded-full bg-gray-50 border border-gray-200"></div>
          </div>

          <!-- Passengers -->
          <div class="px-6 py-5">
            <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Passengers</p>
            <div class="space-y-2">
              @for (p of booking()!.passengers; track p.seatNo) {
                <div class="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm flex-shrink-0">
                      {{ p.name[0].toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-semibold text-gray-900 text-sm">{{ p.name }}</p>
                      @if (p.age) { <p class="text-xs text-gray-400">Age {{ p.age }}</p> }
                    </div>
                  </div>
                  <span class="badge badge-info text-xs">💺 Seat {{ p.seatNo }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Total -->
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span class="text-sm text-gray-500">Total Amount</span>
            <span class="text-2xl font-extrabold text-red-600">₹{{ booking()!.totalAmount | number:'1.0-0' }}</span>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-3">
          @if ((booking()!.status === BookingStatus.Pending || booking()!.status === BookingStatus.Confirmed)
               && booking()!.status !== BookingStatus.OperatorCancelled) {
            <button (click)="cancelBooking()" [disabled]="cancelling()"
              class="flex-1 py-3 text-sm font-semibold rounded-xl border border-red-200 text-red-600
                     hover:bg-red-50 transition-colors disabled:opacity-50">
              {{ cancelling() ? 'Cancelling…' : 'Cancel Booking' }}
            </button>
          }
          <a routerLink="/my-bookings"
            class="flex-1 py-3 text-sm font-semibold rounded-xl border border-gray-300 text-gray-700
                   hover:bg-gray-50 transition-colors text-center">
            ← All Bookings
          </a>
          <a routerLink="/home"
            class="flex-1 py-3 text-sm font-semibold rounded-xl bg-red-600 text-white
                   hover:bg-red-700 transition-colors text-center">
            Book Again
          </a>
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

  BookingStatus = BookingStatus;
  loading    = signal(true);
  cancelling = signal(false);
  booking    = signal<BookingResponse | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bookingSvc.getById(id).subscribe({
      next:  b  => { this.booking.set(b); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Booking not found.'); this.router.navigate(['/my-bookings']); },
    });
  }

  cancelBooking() {
    if (!confirm('Cancel this booking?')) return;
    this.cancelling.set(true);
    this.bookingSvc.cancelPost(this.booking()!.id).subscribe({
      next:  () => { this.toast.success('Booking cancelled.'); this.router.navigate(['/my-bookings']); },
      error: err => { this.cancelling.set(false); this.toast.error(err.error?.message ?? 'Cancellation failed.'); },
    });
  }

  statusBadge(s: BookingStatus): string {
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
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}