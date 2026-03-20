import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../../services/booking.service';
import { ToastService } from '../../../services/toast.service';
import { BookingResponse, BookingStatus, BookingStatusLabels } from '../../../models/booking.models';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="min-h-screen w-full bg-[#121212] text-white py-10 px-4 flex justify-center">
      <div class="w-full max-w-5xl space-y-6">

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-extrabold tracking-tight">My Bookings</h1>
            <p class="text-gray-400">Your recent and upcoming trips</p>
          </div>
          <a routerLink="/home" class="btn btn-primary h-9 px-3">+ Book a ticket</a>
        </div>

        <!-- Loading Skeleton -->
        @if (loading()) {
          <div class="space-y-3">
            @for (_ of [1,2,3]; track $index) {
              <div class="card bg-gray-800 border border-gray-700 animate-pulse">
                <div class="card-body">
                  <div class="h-4 bg-gray-600 rounded w-48 mb-2"></div>
                  <div class="h-3 bg-gray-600 rounded w-32"></div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Empty state -->
        @if (!loading() && bookings().length === 0) {
          <div class="text-center py-16">
            <div class="w-16 h-16 bg-gray-800 border border-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">🎫</div>
            <h3 class="font-semibold text-lg">No bookings yet</h3>
            <p class="text-gray-400 mt-1">Search for buses and book your first ticket.</p>
            <a routerLink="/home" class="btn btn-primary mt-4">Find buses</a>
          </div>
        }

        <!-- Booking list -->
        <div class="space-y-3">
          @for (b of bookings(); track b.id) {
            <div class="card bg-gray-800 border border-gray-700 hover:bg-gray-700 transition">
              <div class="card-body">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                  <!-- Booking info -->
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-lg text-white">{{ b.busCode }}</span>

                      <!-- BADGE with operator-cancelled support -->
                      <span class="badge" [ngClass]="badgeClass(b.status)">
                        {{ statusLabel(b.status) }}
                      </span>

                      <span class="text-gray-400">·</span>
                      <span class="text-sm text-gray-300">{{ b.routeCode }}</span>
                    </div>

                    <p class="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {{ formatDateTime(b.departureUtc) }}
                    </p>

                    <div class="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span>{{ b.passengers.length }} passenger(s)</span>
                      <span>·</span>
                      <span>Seats: {{ b.passengers.map(p => p.seatNo).join(', ') }}</span>
                      <span>·</span>
                      <span class="font-semibold text-gray-200">₹{{ b.totalAmount }}</span>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="flex flex-wrap items-center gap-2 sm:justify-end">

                    <!-- VIEW DETAILS -->
                    <a [routerLink]="['/my-bookings', b.id]" class="btn btn-secondary h-9">
                      View details
                    </a>

                    <!-- PAY NOW (Only if pending, NOT operator cancelled) -->
                    @if (b.status === BookingStatus.Pending &&
                         b.status !== BookingStatus.OperatorCancelled) {
                      <a [routerLink]="['/booking/confirm', b.id]"
                         class="btn btn-success h-9">
                        Pay now
                      </a>
                    }

                    <!-- CANCEL BOOKING (Not allowed if OperatorCancelled) -->
                    @if ((b.status === BookingStatus.Pending || b.status === BookingStatus.Confirmed) &&
                          b.status !== BookingStatus.OperatorCancelled) {
                      <button
                        (click)="cancelBooking(b.id)"
                        [disabled]="cancellingId() === b.id"
                        class="btn btn-ghost h-9 border border-red-600 text-red-400 
                               hover:bg-red-700 hover:text-white disabled:opacity-50">
                        @if (cancellingId() === b.id) { Cancelling... } @else { Cancel }
                      </button>
                    }

                  </div>

                </div>
              </div>
            </div>
          }
        </div>

      </div>
    </section>
  `,
})
export class BookingListComponent implements OnInit {
  private bookingService = inject(BookingService);
  private toast = inject(ToastService);

  BookingStatus = BookingStatus;

  loading = signal(true);
  cancellingId = signal<string | null>(null);
  bookings = signal<BookingResponse[]>([]);

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading.set(true);

    this.bookingService.getMyBookings().subscribe({
      next: (data) => {
        this.bookings.set((data ?? []).sort(
          (a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime()
        ));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load bookings.');
      },
    });
  }

  cancelBooking(id: string): void {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    this.cancellingId.set(id);

    this.bookingService.cancelPost(id).subscribe({
      next: () => {
        this.toast.success('Booking cancelled.');
        this.loadBookings();
        this.cancellingId.set(null);
      },
      error: (err) => {
        this.cancellingId.set(null);
        this.toast.error(err.error?.message ?? 'Cancellation failed.');
      },
    });
  }

  badgeClass(status: BookingStatus): string {
    switch (status) {
      case BookingStatus.Confirmed: return 'badge badge-success';
      case BookingStatus.Cancelled: return 'badge badge-error';
      case BookingStatus.OperatorCancelled: return 'badge badge-error';  // NEW
      case BookingStatus.Refunded: return 'badge badge-neutral';
      case BookingStatus.Pending:
      default: return 'badge badge-accent';
    }
  }

  statusLabel(status: BookingStatus): string {
    return BookingStatusLabels[status] ?? 'Unknown';
  }

  formatDateTime(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}