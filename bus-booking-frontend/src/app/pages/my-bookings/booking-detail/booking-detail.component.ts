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
    <div class="max-w-lg mx-auto px-4 py-8">
      <button (click)="router.navigate(['/my-bookings'])"
        class="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 mb-6">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back to My Bookings
      </button>

      @if (loading()) {
        <div class="flex justify-center py-20">
          <svg class="animate-spin w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      }

      @if (!loading() && booking()) {
        <h1 class="text-2xl font-bold text-slate-800 mb-5">Booking Details</h1>

        <!-- Ticket-style card -->
        <div class="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden mb-4">

          <!-- Top bar -->
          <div class="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-indigo-200 text-xs uppercase tracking-wide">Bus</p>
                <p class="text-white font-bold text-xl">{{ booking()!.busCode }}</p>
                <p class="text-indigo-100 text-sm">{{ booking()!.registrationNumber }}</p>
              </div>
              <div class="text-right">
                <p class="text-indigo-200 text-xs uppercase tracking-wide">Route</p>
                <p class="text-white font-bold text-xl">{{ booking()!.routeCode }}</p>
              </div>
            </div>
          </div>

          <!-- Dashed cut line -->
          <div class="border-dashed border-t border-slate-200 mx-6"></div>

          <div class="px-6 py-5 space-y-3">
            <!-- Booking ref -->
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Booking Ref</span>
              <span class="font-mono font-medium text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded">
                {{ booking()!.id.slice(0,8).toUpperCase() }}
              </span>
            </div>

            <!-- Status -->
            <div class="flex justify-between text-sm items-center">
              <span class="text-slate-500">Status</span>
              <span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium"
                [class]="statusClass(booking()!.status)">
                {{ statusLabel(booking()!.status) }}
              </span>
            </div>

            <!-- Departure -->
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Departure</span>
              <span class="font-medium text-slate-800">{{ formatDateTime(booking()!.departureUtc) }}</span>
            </div>

            <!-- Booked on -->
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Booked on</span>
              <span class="text-slate-600">{{ formatDateTime(booking()!.createdAtUtc) }}</span>
            </div>

            <!-- Passengers -->
            <div class="border-t border-slate-100 pt-3">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Passengers</p>
              <div class="space-y-2">
                @for (p of booking()!.passengers; track p.seatNo) {
                  <div class="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-4 py-2.5">
                    <div>
                      <span class="font-medium text-slate-800">{{ p.name }}</span>
                      @if (p.age) {
                        <span class="text-slate-500 ml-1.5 text-xs">{{ p.age }} yrs</span>
                      }
                    </div>
                    <span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                      Seat {{ p.seatNo }}
                    </span>
                  </div>
                }
              </div>
            </div>

            <!-- Total -->
            <div class="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span class="font-semibold text-slate-800">Total Amount</span>
              <span class="text-2xl font-bold text-indigo-700">₹{{ booking()!.totalAmount }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          @if (booking()!.status === BookingStatus.Pending) {
            <a [routerLink]="['/booking/confirm', booking()!.id]"
              class="flex-1 text-center py-3 bg-green-600 text-white rounded-xl text-sm font-semibold
                     hover:bg-green-700 transition-colors">
              Pay Now
            </a>
          }
          @if (booking()!.status === BookingStatus.Pending || booking()!.status === BookingStatus.Confirmed) {
            <button (click)="cancelBooking()"
              [disabled]="cancelling()"
              class="flex-1 py-3 border border-red-200 text-red-600 rounded-xl text-sm font-semibold
                     hover:bg-red-50 transition-colors disabled:opacity-50">
              @if (cancelling()) { Cancelling... } @else { Cancel Booking }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class BookingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private bookingService = inject(BookingService);
  private toast = inject(ToastService);

  BookingStatus = BookingStatus;
  loading = signal(true);
  cancelling = signal(false);
  booking = signal<BookingResponse | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bookingService.getById(id).subscribe({
      next: (b) => {
        this.booking.set(b);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Booking not found.');
        this.router.navigate(['/my-bookings']);
      },
    });
  }

  cancelBooking(): void {
    if (!confirm('Cancel this booking?')) return;
    this.cancelling.set(true);
    this.bookingService.cancelPost(this.booking()!.id).subscribe({
      next: () => {
        this.toast.success('Booking cancelled.');
        this.router.navigate(['/my-bookings']);
      },
      error: (err) => {
        this.cancelling.set(false);
        this.toast.error(err.error?.message ?? 'Cancellation failed.');
      },
    });
  }

  statusClass(status: BookingStatus): string {
    const map: Record<number, string> = {
      [BookingStatus.Pending]:   'bg-amber-100 text-amber-800',
      [BookingStatus.Confirmed]: 'bg-green-100 text-green-800',
      [BookingStatus.Cancelled]: 'bg-red-100 text-red-800',
      [BookingStatus.Refunded]:  'bg-purple-100 text-purple-800',
    };
    return map[status] ?? 'bg-slate-100 text-slate-800';
  }

  statusLabel(status: BookingStatus): string {
    return BookingStatusLabels[status] ?? 'Unknown';
  }

  formatDateTime(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}