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

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <button (click)="router.navigate(['/search'], { queryParams: backParams() })"
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 class="text-lg font-bold text-gray-900">Select Your Seats</h1>
          @if (draft()) {
            <p class="text-sm text-gray-500">
              <span class="font-semibold text-gray-800">{{ draft()!.schedule.busCode }}</span>
              · {{ draft()!.schedule.routeCode }}
              · {{ formatTime(draft()!.schedule.departureUtc) }}
            </p>
          }
        </div>
      </div>

      <!-- Step indicator -->
      <div class="max-w-5xl mx-auto px-4 sm:px-6 pb-3">
        <div class="flex items-center gap-2 text-xs">
          <span class="flex items-center gap-1.5 font-semibold text-red-600">
            <span class="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs">1</span>
            Select Seats
          </span>
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="flex items-center gap-1.5 text-gray-400">
            <span class="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs">2</span>
            Passenger Details
          </span>
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="flex items-center gap-1.5 text-gray-400">
            <span class="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs">3</span>
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
        Loading seat map…
      </div>
    }

    @if (!loading() && availability()) {
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Seat Map -->
          <div class="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            <!-- Bus front bar -->
            <div class="bg-gray-800 px-5 py-3 flex items-center justify-between">
              <div class="flex items-center gap-2 text-white text-sm font-medium">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"/>
                </svg>
                Driver
              </div>
              <span class="text-gray-300 text-sm">
                {{ availability()!.availableSeats.length }} of {{ availability()!.totalSeats }} seats available
              </span>
            </div>

            <!-- Legend -->
            <div class="px-5 py-3 border-b border-gray-100 flex items-center gap-6 text-xs text-gray-500">
              <span class="flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-md border border-gray-300 bg-white inline-block"></span>
                Available
              </span>
              <span class="flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-md bg-red-600 inline-block"></span>
                Selected
              </span>
              <span class="flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-md bg-gray-200 inline-block"></span>
                Booked
              </span>
            </div>

            <!-- Seat Grid -->
            <div class="p-5">
              <div class="grid gap-2" style="grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));">
                @for (seat of allSeats(); track seat) {
                  <button (click)="toggleSeat(seat)" [disabled]="isBooked(seat)"
                    class="h-12 rounded-lg text-xs font-semibold transition-all active:scale-95 flex items-center justify-center"
                    [class]="seatClass(seat)">
                    {{ seat }}
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- Summary Sidebar -->
          <div class="space-y-4">

            <!-- Selected seats -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 class="font-semibold text-gray-800 mb-3">Your Selection</h3>
              @if (selectedSeats().length === 0) {
                <div class="text-center py-6 text-gray-400">
                  <span class="text-3xl block mb-1">💺</span>
                  <p class="text-sm">Click a seat to select it</p>
                </div>
              } @else {
                <div class="flex flex-wrap gap-2 mb-4">
                  @for (seat of selectedSeats(); track seat) {
                    <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                      💺 {{ seat }}
                      <button (click)="toggleSeat(seat)" class="text-red-400 hover:text-red-600 ml-0.5">×</button>
                    </span>
                  }
                </div>
              }
              <div class="border-t border-gray-100 pt-3 space-y-2 text-sm">
                <div class="flex justify-between text-gray-600">
                  <span>{{ selectedSeats().length }} seat{{ selectedSeats().length !== 1 ? 's' : '' }}</span>
                  <span>× ₹{{ draft()?.schedule?.basePrice | number:'1.0-0' }}</span>
                </div>
                <div class="flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span class="text-red-600">₹{{ total() | number:'1.0-0' }}</span>
                </div>
              </div>
            </div>

            <!-- Bus info -->
            @if (draft()) {
              <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-2 text-sm">
                <h3 class="font-semibold text-gray-800 mb-2">Trip Info</h3>
                <div class="flex justify-between"><span class="text-gray-500">Bus</span><span class="font-medium">{{ draft()!.schedule.busCode }}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">Route</span><span class="font-medium">{{ draft()!.schedule.routeCode }}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">Departure</span><span class="font-medium text-right">{{ formatTime(draft()!.schedule.departureUtc) }}</span></div>
              </div>
            }

            <button (click)="proceed()" [disabled]="selectedSeats().length === 0"
              class="btn-primary w-full py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed">
              Continue with {{ selectedSeats().length }} seat{{ selectedSeats().length !== 1 ? 's' : '' }} →
            </button>
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
    if (this.isBooked(seat))   return 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed';
    if (this.isSelected(seat)) return 'bg-red-600 text-white shadow-md shadow-red-200 border border-red-600';
    return 'bg-white border border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 cursor-pointer';
  }

  toggleSeat(seat: string) {
    if (this.isBooked(seat)) return;
    this.selectedSeats.update(s => s.includes(seat) ? s.filter(x => x !== seat) : [...s, seat]);
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