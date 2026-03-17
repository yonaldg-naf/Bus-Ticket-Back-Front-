import { Component, inject, signal, OnInit } from '@angular/core';
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
    <section class="min-h-screen w-full bg-[#121212] text-white px-4 py-10">

      <!-- Header -->
      <div class="max-w-5xl mx-auto mb-6">
        <button
          (click)="router.navigate(['/search'], { queryParams: backParams() })"
          class="flex items-center gap-1.5 text-sm text-[#D32F2F] hover:underline mb-4">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back to results
        </button>

        <h1 class="text-2xl font-extrabold tracking-tight">Select Seats</h1>
        @if (draft()) {
          <p class="text-gray-400 text-sm mt-1">
            Bus <span class="font-semibold text-white">{{ draft()!.schedule.busCode }}</span>
            · {{ draft()!.schedule.routeCode }}
            · {{ formatTime(draft()!.schedule.departureUtc) }}
          </p>
        }
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-16">
          <svg class="animate-spin w-8 h-8 text-[#D32F2F]" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      }

      @if (!loading() && availability()) {
        <div class="max-w-5xl mx-auto space-y-6">

          <!-- Legend -->
          <div class="flex items-center justify-center gap-8 text-sm text-gray-400">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 bg-[#1f1f1f] border border-gray-700 rounded-md"></div>
              Available
            </div>
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 bg-[#D32F2F] rounded-md"></div>
              Selected
            </div>
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 bg-[#2a2a2a] text-gray-500 border border-gray-800 rounded-md"></div>
              Booked
            </div>
          </div>

          <!-- Seat Grid Card -->
          <div class="bg-[#1f1f1f] border border-gray-800 rounded-2xl shadow-lg p-6">
            <!-- Bus front row -->
            <div class="flex items-center justify-between mb-4">
              <div class="text-xs text-gray-400 font-medium">DRIVER</div>
              <div class="flex-1 h-px bg-gray-700 mx-4"></div>
              <div class="text-xs text-gray-400 font-medium">
                {{ availability()!.availableSeats.length }} seats available
              </div>
            </div>

            <div class="grid gap-2"
                 style="grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));">
              @for (seat of allSeats(); track seat) {
                <button
                  (click)="toggleSeat(seat)"
                  [disabled]="isBooked(seat)"
                  [class]="seatClass(seat)"
                  class="w-11 h-11 rounded-lg text-xs font-semibold transition-all active:scale-95">
                  {{ seat }}
                </button>
              }
            </div>
          </div>

          <!-- Summary + CTA -->
          <div class="bg-[#1f1f1f] border border-gray-800 rounded-2xl shadow-lg p-6">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm text-gray-400">Selected seats</div>
                <div class="font-semibold text-white">
                  @if (selectedSeats().length === 0) {
                    <span class="text-gray-400">None selected</span>
                  } @else {
                    {{ selectedSeats().join(', ') }}
                  }
                </div>
              </div>

              <div class="text-right">
                <div class="text-sm text-gray-400">Total</div>
                <div class="text-2xl font-bold text-white">
                  ₹{{ (selectedSeats().length * (draft()?.schedule?.basePrice ?? 0)) }}
                </div>
              </div>
            </div>

            <button
              (click)="proceed()"
              [disabled]="selectedSeats().length === 0"
              class="w-full py-3 mt-4 rounded-xl font-semibold text-white
                     bg-gradient-to-r from-[#D32F2F] to-[#7f1d1d] hover:opacity-90 active:scale-95
                     transition disabled:opacity-50"
            >
              Continue ({{ selectedSeats().length }})
            </button>
          </div>

        </div>
      }
    </section>
  `,
})
export class SeatSelectionComponent implements OnInit {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private scheduleService = inject(ScheduleService);
  private bookingState = inject(BookingStateService);
  private toast = inject(ToastService);

  loading = signal(true);
  availability = signal<SeatAvailabilityResponse | null>(null);
  selectedSeats = signal<string[]>([]);
  draft = this.bookingState.draft;

  ngOnInit(): void {
    const scheduleId = this.route.snapshot.paramMap.get('scheduleId')!;
    if (!this.draft()) {
      this.scheduleService.getById(scheduleId).subscribe({
        next: (s) => this.bookingState.setSchedule(s),
        error: () => {},
      });
    }

    this.scheduleService.getSeatAvailability(scheduleId).subscribe({
      next: (data) => { this.availability.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Failed to load seat availability.'); },
    });
  }

  allSeats(): string[] {
    const av = this.availability();
    if (!av) return [];
    return [...av.availableSeats, ...av.bookedSeats].sort((a, b) => {
      const na = parseInt(a, 10), nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }

  isBooked(seat: string): boolean {
    return this.availability()?.bookedSeats.includes(seat) ?? false;
  }

  isSelected(seat: string): boolean {
    return this.selectedSeats().includes(seat);
  }

  seatClass(seat: string): string {
    if (this.isBooked(seat)) {
      return 'bg-[#2a2a2a] text-gray-500 border border-gray-800 cursor-not-allowed';
    }
    if (this.isSelected(seat)) {
      return 'bg-[#D32F2F] text-white shadow-lg';
    }
    return 'bg-[#1f1f1f] border border-gray-700 text-gray-400 hover:bg-[#292929]';
  }

  toggleSeat(seat: string): void {
    if (this.isBooked(seat)) return;
    this.selectedSeats.update(seats =>
      seats.includes(seat) ? seats.filter(s => s !== seat) : [...seats, seat]
    );
  }

  proceed(): void {
    if (this.selectedSeats().length === 0) return;
    this.bookingState.setSeats(this.selectedSeats());
    const scheduleId = this.route.snapshot.paramMap.get('scheduleId')!;
    this.router.navigate(['/booking/passengers', scheduleId]);
  }

  formatTime(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  backParams() {
    const d = this.draft();
    return d ? { from: '', to: '' } : {};
  }
} 