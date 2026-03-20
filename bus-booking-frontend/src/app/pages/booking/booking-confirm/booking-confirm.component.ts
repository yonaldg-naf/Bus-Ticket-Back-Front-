import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../../services/booking.service';
import { ToastService } from '../../../services/toast.service';
import { BookingResponse, BookingStatus, BookingStatusLabels } from '../../../models/booking.models';

@Component({
  selector: 'app-booking-confirm',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <section class="min-h-screen w-full bg-[#121212] text-white flex justify-center items-start py-10 px-4">
      <div class="w-full max-w-3xl space-y-6">

        <!-- LOADING -->
        @if (loading()) {
          <div class="flex justify-center py-20">
            <svg class="animate-spin w-10 h-10 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        }

        <!-- SUCCESS CONFIRMATION -->
        @if (!loading() && booking() && booking()!.status === BookingStatus.Confirmed) {
          <div class="text-center mb-10">
            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h1 class="text-2xl font-extrabold tracking-tight">Booking Confirmed!</h1>
            <p class="text-gray-300 mt-1">Your ticket is booked successfully.</p>
          </div>
        }

        <!-- MAIN CONTENT -->
        @if (!loading() && booking()) {

          <!-- OPERATOR CANCEL BANNER -->
          @if (booking()!.status === BookingStatus.OperatorCancelled) {
            <div class="p-4 bg-red-900/40 border border-red-700 text-red-200 rounded-xl mb-3">
              This trip was cancelled by the operator.
              <div *ngIf="booking()!.scheduleCancelReason" class="text-sm text-red-300 mt-1">
                Reason: {{ booking()!.scheduleCancelReason }}
              </div>
            </div>
          }

          <!-- STATUS BADGE -->
          <div class="mb-4">
            <span class="badge" [ngClass]="statusBadgeClass(booking()!.status)">
              {{ statusLabel(booking()!.status) }}
            </span>
          </div>

          <!-- BOOKING CARD -->
          <div class="card bg-[#1E1E1E] border border-gray-700">
            <div class="card-body">
              <h2 class="text-xl font-bold mb-3 text-white">Booking Details</h2>
              <div class="space-y-2 text-sm text-gray-300">
                <div><span class="font-semibold">Bus:</span> {{ booking()!.busCode }} ({{ booking()!.registrationNumber }})</div>
                <div><span class="font-semibold">Route:</span> {{ booking()!.routeCode }}</div>
                <div><span class="font-semibold">Departure:</span> {{ formatDateTime(booking()!.departureUtc) }}</div>
                <div><span class="font-semibold">Status:</span> {{ statusLabel(booking()!.status) }}</div>
              </div>
            </div>
          </div>

          <!-- PASSENGERS -->
          <div class="card bg-[#1E1E1E] border border-gray-700 mt-6">
            <div class="card-body">
              <h2 class="text-xl font-bold mb-3 text-white">Passengers</h2>
              <div class="space-y-3">
                @for (p of booking()!.passengers; track p.seatNo) {
                  <div class="flex justify-between pb-2 border-b border-gray-700">
                    <div>
                      <div class="font-semibold">{{ p.name }}</div>
                      @if (p.age) {
                        <div class="text-gray-400 text-xs">Age: {{ p.age }}</div>
                      }
                    </div>
                    <div class="font-semibold text-[var(--accent)]">Seat {{ p.seatNo }}</div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- PAYMENT SUMMARY -->
          <div class="card bg-[#1E1E1E] border border-gray-700 mt-6">
            <div class="card-body">
              <h2 class="text-xl font-bold mb-3 text-white">Payment Summary</h2>
              <div class="flex items-center justify-between">
                <span class="text-gray-400">Total Amount</span>
                <span class="text-2xl font-bold text-white">₹{{ booking()!.totalAmount }}</span>
              </div>

              <!-- ACTION BUTTONS -->
              <div class="flex flex-col sm:flex-row gap-3 mt-6">

                <!-- PAY BUTTON (DISABLED IF operator cancelled) -->
                @if (booking()!.status === BookingStatus.Pending &&
                     booking()!.status !== BookingStatus.OperatorCancelled) {
                  <button (click)="processPayment()"
                          [disabled]="payLoading()"
                          class="btn btn-primary flex-1">
                    @if (payLoading()) {
                      <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Processing...
                    } @else {
                      Pay ₹{{ booking()!.totalAmount }}
                    }
                  </button>
                }

                <!-- CANCEL BUTTON (NOT ALLOWED IF operator cancelled) -->
                @if ((booking()!.status === BookingStatus.Pending ||
                      booking()!.status === BookingStatus.Confirmed) &&
                      booking()!.status !== BookingStatus.OperatorCancelled) {
                  <button (click)="cancelBooking()"
                          class="btn btn-ghost flex-1 border border-red-600 text-red-500 hover:bg-red-700/10">
                    Cancel Booking
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- FOOTER -->
          <div class="flex gap-3 mt-6">
            <a routerLink="/my-bookings" class="btn btn-secondary flex-1 h-[48px]">My Bookings</a>
            <a routerLink="/home" class="btn btn-primary flex-1 h-[48px]">Book Another</a>
          </div>

        }
      </div>
    </section>
  `,
})
export class BookingConfirmComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookingService = inject(BookingService);
  private toast = inject(ToastService);

  BookingStatus = BookingStatus;

  loading = signal(true);
  payLoading = signal(false);
  booking = signal<BookingResponse | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('bookingId')!;
    this.bookingService.getById(id).subscribe({
      next: (b) => { this.booking.set(b); this.loading.set(false); },
      error: () => {
        this.toast.error('Booking not found.');
        this.router.navigate(['/my-bookings']);
      },
    });
  }

  statusBadgeClass(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.Confirmed: return 'badge-success';
      case BookingStatus.Cancelled: return 'badge-error';
      case BookingStatus.OperatorCancelled: return 'badge-error'; // NEW
      case BookingStatus.Refunded: return 'badge-neutral';
      default: return 'badge-accent';
    }
  }

  statusLabel(status: BookingStatus): string {
    return BookingStatusLabels[status] ?? 'Unknown';
  }

  formatDateTime(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  }

  processPayment(): void {
    if (!this.booking()) return;

    this.payLoading.set(true);

    this.bookingService.pay(this.booking()!.id, {
      amount: this.booking()!.totalAmount,
      providerReference: `PAY-${Date.now()}`
    }).subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.payLoading.set(false);
        this.toast.success('Payment successful! 🎉');
      },
      error: (err) => {
        this.payLoading.set(false);
        this.toast.error(err.error?.message ?? 'Payment failed.');
      }
    });
  }

  cancelBooking(): void {
    if (!this.booking()) return;
    if (!confirm('Cancel this booking?')) return;

    this.bookingService.cancelPost(this.booking()!.id).subscribe({
      next: () => {
        this.toast.success('Booking cancelled.');
        this.router.navigate(['/my-bookings']);
      },
      error: (err) => {
        this.toast.error(err.error?.message ?? 'Cancellation failed.');
      }
    });
  }
}