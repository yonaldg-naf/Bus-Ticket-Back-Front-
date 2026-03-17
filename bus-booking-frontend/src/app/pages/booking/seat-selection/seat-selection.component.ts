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
    <section class="container max-w-5xl pt-10">
      <!-- Header -->
      <div class="mb-6">
        <button
          (click)="router.navigate(['/search'], { queryParams: backParams() })"
          class="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline mb-4">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back to results
        </button>

        <h1 class="text-2xl font-extrabold tracking-tight">Select Seats</h1>
        @if (draft()) {
          <p class="text-muted text-sm mt-1">
            Bus <span class="font-semibold">{{ draft()!.schedule.busCode }}</span>
            · {{ draft()!.schedule.routeCode }}
            · {{ formatTime(draft()!.schedule.departureUtc) }}
          </p>
        }
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-16">
          <svg class="animate-spin w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      }

      @if (!loading() && availability()) {
        <!-- Legend -->
        <div class="flex items-center justify-center gap-8 mb-6 text-sm text-[var(--graphite)]">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-[#F6F6F6] border border-[var(--border)] rounded-md"></div>
            Available
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-[var(--accent)] rounded-md"></div>
            Selected
          </div>
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 bg-[#ECECEC] text-[#A5A5A5] border border-[#E0E0E0] rounded-md"></div>
            Booked
          </div>
        </div>

        <!-- Seat Grid -->
        <div class="card">
          <div class="card-body">
            <!-- Bus front indicator row -->
            <div class="flex items-center justify-between mb-4">
              <div class="text-xs text-muted font-medium">DRIVER</div>
              <div class="flex-1 h-px bg-[var(--border)] mx-4"></div>
              <div class="text-xs text-muted font-medium">
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
        </div>

        <!-- Summary + CTA -->
        <div class="card mt-6">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm text-muted">Selected seats</div>
                <div class="font-semibold">
                  @if (selectedSeats().length === 0) {
                    <span class="text-muted">None selected</span>
                  } @else {
                    {{ selectedSeats().join(', ') }}
                  }
                </div>
              </div>

              <div class="text-right">
                <div class="text-sm text-muted">Total</div>
                <div class="text-2xl font-bold">
                  ₹{{ (selectedSeats().length * (draft()?.schedule?.basePrice ?? 0)) }}
                </div>
              </div>
            </div>

            <button
              (click)="proceed()"
              [disabled]="selectedSeats().length === 0"
              class="btn btn-primary w-full mt-4">
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

    // If no draft (e.g., refresh), recover schedule for summary (non-blocking)
    if (!this.draft()) {
      this.scheduleService.getById(scheduleId).subscribe({
        next: (s) => this.bookingState.setSchedule(s),
        error: () => {/* ignore; summary will just hide */},
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
      // Booked (gray & disabled)
      return 'bg-[#ECECEC] text-[#A5A5A5] border border-[#E0E0E0] cursor-not-allowed';
    }
    if (this.isSelected(seat)) {
      // Selected (accent + ring)
      return 'bg-[var(--accent)] text-white shadow-ring';
    }
    // Available (neutral, hoverable)
    return 'bg-[#F6F6F6] border border-[var(--border)] text-[var(--graphite)] hover:bg-[#F1F1F1]';
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
    // If you saved search params in state, you can return them here to prefill the search page.
    // Keeping your previous shape so routing doesn't break.
    const d = this.draft();
    return d ? { from: '', to: '' } : {};
  }
}
