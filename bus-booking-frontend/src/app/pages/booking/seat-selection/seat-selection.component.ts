import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ScheduleService } from '../../../services/schedule.service';
import { BookingStateService } from '../../../services/booking-state.service';
import { ToastService } from '../../../services/toast.service';
import { SeatAvailabilityResponse } from '../../../models/bus-schedule.models';

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="min-h-screen bg-gray-50">

    <!-- ── Header with steps ── -->
    <div class="bg-white border-b border-gray-100 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <div class="flex items-center gap-3 mb-4">
          <button (click)="router.navigate(['/search'], { queryParams: backParams() })"
            class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors text-gray-500 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 class="text-lg font-extrabold text-gray-900">Select Your Seats</h1>
            @if (draft()) {
              <p class="text-sm text-gray-500">
                <span class="font-semibold text-gray-700">{{ draft()!.schedule.busCode }}</span>
                <span class="mx-1.5 text-gray-300">·</span>
                {{ draft()!.schedule.routeCode }}
                <span class="mx-1.5 text-gray-300">·</span>
                {{ formatTime(draft()!.schedule.departureUtc) }}
              </p>
            }
          </div>
        </div>

        <!-- Step indicator -->
        <div class="flex items-center gap-2">
          <div class="step-active">
            <span class="step-dot-active">1</span>
            <span class="hidden sm:inline">Seat Selection</span>
          </div>
          <div class="flex-1 h-0.5 bg-gray-200 rounded"></div>
          <div class="step-pending">
            <span class="step-dot-pending">2</span>
            <span class="hidden sm:inline">Passenger Details</span>
          </div>
          <div class="flex-1 h-0.5 bg-gray-200 rounded"></div>
          <div class="step-pending">
            <span class="step-dot-pending">3</span>
            <span class="hidden sm:inline">Payment</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    @if (loading()) {
      <div class="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
        <svg class="animate-spin w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <p class="text-sm font-medium">Loading seat map…</p>
      </div>
    }

    @if (!loading() && availability()) {
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- ── Seat Map ── -->
          <div class="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            <!-- Bus front bar -->
            <div class="bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-4 flex items-center justify-between">
              <div class="flex items-center gap-3 text-white">
                <div class="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"/>
                  </svg>
                </div>
                <div>
                  <p class="font-bold text-sm">Driver's Cabin</p>
                  <p class="text-gray-400 text-xs">Front of bus</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-white font-bold text-sm">{{ availability()!.availableSeats.length }} seats available</p>
                <p class="text-gray-400 text-xs">of {{ availability()!.totalSeats }} total</p>
              </div>
            </div>

            <!-- Legend -->
            <div class="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-6 text-xs text-gray-600">
              <span class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg border-2 border-gray-300 bg-white inline-block"></span>
                Available
              </span>
              <span class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-red-600 inline-block shadow-sm shadow-red-200"></span>
                Selected
              </span>
              <span class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-lg bg-gray-200 inline-block"></span>
                Booked
              </span>
            </div>

            <!-- Seat Grid -->
            <div class="p-5">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tap an available seat · Max 6 seats per booking</p>
              <div class="grid gap-2.5" style="grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));">
                @for (seat of allSeats(); track seat) {
                  <button (click)="toggleSeat(seat)" [disabled]="isBooked(seat)"
                    class="h-12 rounded-xl text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5"
                    [class]="seatClass(seat)">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 13c0-2.21 1.79-4 4-4s4 1.79 4 4v3H7v-3zm-2 3H4v-3c0-1.1.9-2 2-2v5zm14-5c1.1 0 2 .9 2 2v3h-1v-3c0-1.1-.9-2-2-2v2zm-1 5v-5c1.1 0 2 .9 2 2v3h-2z"/>
                    </svg>
                    <span>{{ seat }}</span>
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- ── Summary Sidebar ── -->
          <div class="space-y-4">

            <!-- Selected seats card -->
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                <h3 class="font-bold text-gray-800">Your Selection</h3>
                <p class="text-xs text-gray-400 mt-0.5">{{ selectedSeats().length }} of 6 seats selected</p>
              </div>
              <div class="p-5">
                @if (selectedSeats().length === 0) {
                  <div class="text-center py-6 text-gray-400">
                    <div class="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">💺</div>
                    <p class="text-sm font-medium text-gray-500">No seats selected</p>
                    <p class="text-xs text-gray-400 mt-1">Click a seat to select it</p>
                  </div>
                } @else {
                  <div class="flex flex-wrap gap-2 mb-4">
                    @for (seat of selectedSeats(); track seat) {
                      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
                        💺 {{ seat }}
                        <button (click)="toggleSeat(seat)" class="text-red-400 hover:text-red-600 transition-colors ml-0.5 text-base leading-none">×</button>
                      </span>
                    }
                  </div>
                }

                <div class="border-t border-gray-100 pt-4 space-y-2 text-sm">
                  <div class="flex justify-between text-gray-500">
                    <span>{{ selectedSeats().length }} seat{{ selectedSeats().length !== 1 ? 's' : '' }} × ₹{{ draft()?.schedule?.basePrice | number:'1.0-0' }}</span>
                    <span>₹{{ total() | number:'1.0-0' }}</span>
                  </div>
                  <div class="flex justify-between font-extrabold text-gray-900 text-lg pt-1">
                    <span>Total</span>
                    <span class="text-red-600">₹{{ total() | number:'1.0-0' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Trip info card -->
            @if (draft()) {
              <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3 text-sm">
                <h3 class="font-bold text-gray-800">Trip Info</h3>
                <div class="space-y-2.5">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400">Bus</span>
                    <span class="font-semibold text-gray-800">{{ draft()!.schedule.busCode }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400">Route</span>
                    <span class="font-semibold text-gray-800 font-mono text-xs">{{ draft()!.schedule.routeCode }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400">Departure</span>
                    <span class="font-semibold text-gray-800 text-right text-xs">{{ formatTime(draft()!.schedule.departureUtc) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400">Price/seat</span>
                    <span class="font-bold text-red-600">₹{{ draft()!.schedule.basePrice | number:'1.0-0' }}</span>
                  </div>
                </div>
              </div>
            }

            <button (click)="proceed()" [disabled]="selectedSeats().length === 0"
              class="w-full py-4 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none text-base">
              @if (selectedSeats().length === 0) {
                Select seats to continue
              } @else {
                Continue with {{ selectedSeats().length }} seat{{ selectedSeats().length !== 1 ? 's' : '' }} →
              }
            </button>

            <p class="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
              </svg>
              100% Secure & Encrypted Payment
            </p>
          </div>
        </div>
      </div>
    }
  </div>
  `,
})
export class SeatSelectionComponent implements OnInit {
  router              = inject(Router);
  private route       = inject(ActivatedRoute);
  private scheduleSvc = inject(ScheduleService);
  private bookingState= inject(BookingStateService);
  private toast       = inject(ToastService);

  loading       = signal(true);
  availability  = signal<SeatAvailabilityResponse | null>(null);
  selectedSeats = signal<string[]>([]);
  draft         = this.bookingState.draft;

  total = computed(() =>
    this.selectedSeats().length * (this.draft()?.schedule?.basePrice ?? 0)
  );

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('scheduleId')!;
    if (!this.draft()) {
      this.scheduleSvc.getById(id).subscribe({ next: s => this.bookingState.setSchedule(s), error: () => {} });
    }
    this.scheduleSvc.getSeatAvailability(id).subscribe({
      next:  d  => { this.availability.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Failed to load seat availability.'); },
    });
  }

  allSeats(): string[] {
    const av = this.availability();
    if (!av) return [];
    return [...av.availableSeats, ...av.bookedSeats].sort((a, b) => {
      const na = parseInt(a), nb = parseInt(b);
      return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b);
    });
  }

  isBooked(seat: string)   { return this.availability()?.bookedSeats.includes(seat) ?? false; }
  isSelected(seat: string) { return this.selectedSeats().includes(seat); }

  seatClass(seat: string): string {
    if (this.isBooked(seat))   return 'seat-booked';
    if (this.isSelected(seat)) return 'seat-selected';
    return 'seat-available';
  }

  toggleSeat(seat: string) {
    if (this.isBooked(seat)) return;
    this.selectedSeats.update(s => {
      if (s.includes(seat)) return s.filter(x => x !== seat);
      if (s.length >= 6) { this.toast.error('Maximum 6 seats per booking.'); return s; }
      return [...s, seat];
    });
  }

  proceed() {
    if (this.selectedSeats().length === 0) return;
    this.bookingState.setSeats(this.selectedSeats());
    this.router.navigate(['/booking/passengers', this.route.snapshot.paramMap.get('scheduleId')!]);
  }

  formatTime(utc: string) {
    return new Date(utc).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  backParams() { return {}; }
}
