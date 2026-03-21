import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../../services/booking.service';
import { ToastService } from '../../../services/toast.service';
import { BookingResponse, BookingStatus, BookingStatusLabels } from '../../../models/booking.models';

@Component({
  selector: 'app-booking-confirm',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="min-h-screen bg-gray-50">

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <div>
          <h1 class="text-lg font-bold text-gray-900">Booking Confirmation</h1>
          <p class="text-sm text-gray-500">Review and complete your payment</p>
        </div>
        <!-- Steps -->
        <div class="flex items-center gap-2 text-xs mt-3">
          <span class="flex items-center gap-1.5 text-green-600 font-medium">
            <span class="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
            Select Seats
          </span>
          <div class="flex-1 h-px bg-green-300"></div>
          <span class="flex items-center gap-1.5 text-green-600 font-medium">
            <span class="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
            Passenger Details
          </span>
          <div class="flex-1 h-px bg-red-300"></div>
          <span class="flex items-center gap-1.5 font-semibold text-red-600">
            <span class="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs">3</span>
            Payment
          </span>
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
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 class="font-semibold text-gray-800">Booking Details</h2>
                <span class="badge" [class]="statusBadgeClass(booking()!.status)">
                  {{ statusLabel(booking()!.status) }}
                </span>
              </div>
              <div class="p-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Bus</p>
                  <p class="font-semibold text-gray-900">{{ booking()!.busCode }}</p>
                  <p class="text-gray-400 text-xs font-mono">{{ booking()!.registrationNumber }}</p>
                </div>
                <div>
                  <p class="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Route</p>
                  <p class="font-semibold text-gray-900">{{ booking()!.routeCode }}</p>
                </div>
                <div class="col-span-2">
                  <p class="text-gray-500 text-xs uppercase tracking-wide mb-0.5">Departure</p>
                  <p class="font-semibold text-gray-900">{{ formatDateTime(booking()!.departureUtc) }}</p>
                </div>
              </div>
            </div>

            <!-- Passengers -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100">
                <h2 class="font-semibold text-gray-800">Passengers</h2>
              </div>
              <div class="divide-y divide-gray-100">
                @for (p of booking()!.passengers; track p.seatNo) {
                  <div class="px-5 py-3.5 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm">
                        {{ p.name[0].toUpperCase() }}
                      </div>
                      <div>
                        <p class="font-medium text-gray-900 text-sm">{{ p.name }}</p>
                        @if (p.age) { <p class="text-xs text-gray-400">Age {{ p.age }}</p> }
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
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sticky top-20">
              <h2 class="font-semibold text-gray-800 mb-4">Payment Summary</h2>

              <div class="space-y-2 text-sm mb-5">
                <div class="flex justify-between text-gray-600">
                  <span>{{ booking()!.passengers.length }} passenger{{ booking()!.passengers.length !== 1 ? 's' : '' }}</span>
                </div>
                <div class="flex justify-between font-bold text-gray-900 text-xl pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span class="text-red-600">₹{{ booking()!.totalAmount | number:'1.0-0' }}</span>
                </div>
              </div>

              <!-- Pay button -->
              @if (booking()!.status === BookingStatus.Pending) {
                <button (click)="processPayment()" [disabled]="payLoading()"
                  class="btn-primary w-full py-3.5 text-base mb-3">
                  @if (payLoading()) {
                    <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Processing…
                  } @else {
                    🔒 Pay ₹{{ booking()!.totalAmount | number:'1.0-0' }}
                  }
                </button>
              }

              @if (booking()!.status === BookingStatus.Confirmed) {
                <div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center mb-3">
                  <p class="text-green-700 font-semibold text-sm">✅ Payment Complete</p>
                </div>
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
              <p class="text-xs text-gray-400 text-center mt-4 flex items-center justify-center gap-1">
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

  BookingStatus = BookingStatus;
  loading    = signal(true);
  payLoading = signal(false);
  booking    = signal<BookingResponse | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('bookingId')!;
    this.bookingSvc.getById(id).subscribe({
      next:  b  => { this.booking.set(b); this.loading.set(false); },
      error: () => { this.toast.error('Booking not found.'); this.router.navigate(['/my-bookings']); },
    });
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
      amount: this.booking()!.totalAmount,
      providerReference: `PAY-${Date.now()}`,
    }).subscribe({
      next:  b  => { this.booking.set(b); this.payLoading.set(false); this.toast.success('Payment successful! 🎉'); },
      error: err => { this.payLoading.set(false); this.toast.error(err.error?.message ?? 'Payment failed.'); },
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