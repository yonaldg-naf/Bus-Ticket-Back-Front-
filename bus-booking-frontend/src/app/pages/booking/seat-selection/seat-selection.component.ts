import { Component, inject, signal, OnInit, computed, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../../../services/schedule.service';
import { BookingStateService } from '../../../services/booking-state.service';
import { ToastService } from '../../../services/toast.service';
import { SeatAvailabilityResponse } from '../../../models/bus-schedule.models';
import { Location } from '@angular/common';

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="min-h-screen bg-gray-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div class="flex items-center gap-3 mb-4">
          <button (click)="goBack()" class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors text-gray-500 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div>
            <h1 class="text-lg font-extrabold text-gray-900 dark:text-white">Select Your Seats</h1>
            @if (draft()) {
              <p class="text-sm text-gray-500 dark:text-slate-400">
                <span class="font-semibold text-gray-700 dark:text-slate-200">{{ draft()!.schedule.busCode }}</span>
                <span class="mx-1.5 text-gray-300">�</span>{{ draft()!.schedule.routeCode }}
                <span class="mx-1.5 text-gray-300">�</span>{{ formatTime(draft()!.schedule.departureUtc) }}
              </p>
            }
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="step-active"><span class="step-dot-active">1</span><span class="hidden sm:inline">Seat Selection</span></div>
          <div class="flex-1 h-0.5 bg-gray-200 rounded"></div>
          <div class="step-pending"><span class="step-dot-pending">2</span><span class="hidden sm:inline">Passenger Details</span></div>
          <div class="flex-1 h-0.5 bg-gray-200 rounded"></div>
          <div class="step-pending"><span class="step-dot-pending">3</span><span class="hidden sm:inline">Payment</span></div>
        </div>
      </div>
    </div>

    @if (loading()) {
      <div class="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
        <svg class="animate-spin w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <p class="text-sm font-medium">Loading seat map...</p>
      </div>
    }

    @if (!loading() && availability()) {
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- Seat Map -->
          <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <!-- Bus front -->
            <div class="bg-gradient-to-r from-gray-800 to-gray-900 px-5 py-4 flex items-center justify-between">
              <div class="flex items-center gap-3 text-white">
                <div class="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"/></svg>
                </div>
                <div><p class="font-bold text-sm">Driver's Cabin</p><p class="text-gray-400 text-xs">Front of bus</p></div>
              </div>
              <div class="text-right">
                <p class="text-white font-bold text-sm">{{ availability()!.availableSeats.length }} available</p>
                <p class="text-gray-400 text-xs">of {{ availability()!.totalSeats }} total</p>
              </div>
            </div>

            <!-- Hold timer -->
            @if (holdSeconds() > 0) {
              <div class="px-5 py-2.5 flex items-center justify-between text-sm" [class]="holdSeconds() < 120 ? 'bg-red-50 dark:bg-red-900/20 border-b border-red-100' : 'bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100'">
                <div class="flex items-center gap-2" [class]="holdSeconds() < 120 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span class="font-semibold">Seat hold expires in {{ formatHoldTime() }}</span>
                </div>
                <div class="w-32 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" [class]="holdSeconds() < 120 ? 'bg-red-500' : 'bg-amber-500'" [style.width.%]="(holdSeconds() / 600) * 100"></div>
                </div>
              </div>
            }

            <!-- Legend -->
            <div class="px-5 py-3 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700 flex items-center gap-4 flex-wrap text-xs text-gray-600 dark:text-slate-400">
              <span class="flex items-center gap-2"><span class="w-6 h-6 rounded-lg border-2 border-gray-300 bg-white inline-block"></span>Aisle</span>
              <span class="flex items-center gap-2"><span class="w-6 h-6 rounded-lg border-2 border-blue-300 bg-blue-50 inline-block"></span>Window</span>
              <span class="flex items-center gap-2"><span class="w-6 h-6 rounded-lg bg-red-600 inline-block shadow-sm shadow-red-200"></span>Selected</span>
              <span class="flex items-center gap-2"><span class="w-6 h-6 rounded-lg bg-gray-200 dark:bg-slate-600 inline-block"></span>Booked</span>
            </div>

            <!-- Visual Bus Layout -->
            <div class="p-5">
              <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Bus Layout � Maximum 6 seats per booking</p>
              <!-- Column headers with window/aisle labels -->
              <div class="grid grid-cols-[1fr_1fr_20px_1fr_1fr] gap-1.5 mb-2 px-1">
                <div class="text-center">
                  <div class="text-xs text-blue-500 font-bold">A</div>
                  <div class="text-[9px] text-blue-400">Window</div>
                </div>
                <div class="text-center">
                  <div class="text-xs text-gray-400 font-medium">B</div>
                  <div class="text-[9px] text-gray-300">Aisle</div>
                </div>
                <div></div>
                <div class="text-center">
                  <div class="text-xs text-gray-400 font-medium">C</div>
                  <div class="text-[9px] text-gray-300">Aisle</div>
                </div>
                <div class="text-center">
                  <div class="text-xs text-blue-500 font-bold">D</div>
                  <div class="text-[9px] text-blue-400">Window</div>
                </div>
              </div>
              <!-- Seat rows -->
              @for (row of seatRows(); track row.rowNum) {
                <div class="grid grid-cols-[1fr_1fr_20px_1fr_1fr] gap-1.5 mb-1.5 items-center">
                  <button (click)="toggleSeat(row.a)" [disabled]="isBooked(row.a)" [class]="seatBtnClass(row.a, 'window')" title="Seat {{ row.a }} (Window)">
                    <span class="text-[10px] leading-none">{{ row.a }}</span>
                  </button>
                  <button (click)="toggleSeat(row.b)" [disabled]="isBooked(row.b)" [class]="seatBtnClass(row.b, 'aisle')" title="Seat {{ row.b }} (Aisle)">
                    <span class="text-[10px] leading-none">{{ row.b }}</span>
                  </button>
                  <div class="flex items-center justify-center"><span class="text-[9px] text-gray-300 font-bold">{{ row.rowNum }}</span></div>
                  <button (click)="toggleSeat(row.c)" [disabled]="isBooked(row.c)" [class]="seatBtnClass(row.c, 'aisle')" title="Seat {{ row.c }} (Aisle)">
                    <span class="text-[10px] leading-none">{{ row.c }}</span>
                  </button>
                  <button (click)="toggleSeat(row.d)" [disabled]="isBooked(row.d)" [class]="seatBtnClass(row.d, 'window')" title="Seat {{ row.d }} (Window)">
                    <span class="text-[10px] leading-none">{{ row.d }}</span>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-4">
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-700/40">
                <h3 class="font-bold text-gray-800 dark:text-white">Your Selection</h3>
                <p class="text-xs text-gray-400 mt-0.5">{{ selectedSeats().length }} of 6 seats selected</p>
              </div>
              <div class="p-5">
                @if (selectedSeats().length === 0) {
                  <div class="text-center py-6 text-gray-400">
                    <div class="w-14 h-14 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">??</div>
                    <p class="text-sm font-medium text-gray-500 dark:text-slate-400">No seats selected</p>
                    <p class="text-xs text-gray-400 mt-1">Click a seat to select it</p>
                  </div>
                } @else {
                  <div class="flex flex-wrap gap-2 mb-4">
                    @for (seat of selectedSeats(); track seat) {
                      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
                        ?? {{ seat }}
                        <span class="text-[9px] font-normal text-red-400">{{ seatTypeLabel(seat) }}</span>
                        <button (click)="toggleSeat(seat)" class="text-red-400 hover:text-red-600 transition-colors ml-0.5 text-base leading-none">x</button>
                      </span>
                    }
                  </div>
                }
                <div class="border-t border-gray-100 dark:border-slate-700 pt-4 space-y-2 text-sm">
                  <div class="flex justify-between text-gray-500 dark:text-slate-400">
                    <span>{{ selectedSeats().length }} seat{{ selectedSeats().length !== 1 ? 's' : '' }} x Rs{{ draft()?.schedule?.basePrice | number:'1.0-0' }}</span>
                    <span>Rs{{ total() | number:'1.0-0' }}</span>
                  </div>
                  <div class="flex justify-between font-extrabold text-gray-900 dark:text-white text-lg pt-1">
                    <span>Total</span>
                    <span class="text-red-600">Rs{{ total() | number:'1.0-0' }}</span>
                  </div>
                </div>
              </div>
            </div>

            @if (draft()) {
              <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 space-y-3 text-sm">
                <h3 class="font-bold text-gray-800 dark:text-white">Trip Info</h3>
                <div class="space-y-2.5">
                  <div class="flex justify-between items-center"><span class="text-gray-400">Bus</span><span class="font-semibold text-gray-800 dark:text-white">{{ draft()!.schedule.busCode }}</span></div>
                  <div class="flex justify-between items-center"><span class="text-gray-400">Route</span><span class="font-semibold text-gray-800 dark:text-white font-mono text-xs">{{ draft()!.schedule.routeCode }}</span></div>
                  <div class="flex justify-between items-center"><span class="text-gray-400">Departure</span><span class="font-semibold text-gray-800 dark:text-white text-right text-xs">{{ formatTime(draft()!.schedule.departureUtc) }}</span></div>
                  <div class="flex justify-between items-center"><span class="text-gray-400">Price/seat</span><span class="font-bold text-red-600">Rs{{ draft()!.schedule.basePrice | number:'1.0-0' }}</span></div>
                </div>
              </div>
            }

            <!-- Passenger quick-entry list -->
            @if (selectedSeats().length > 0) {
              <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div class="px-5 py-3.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-700/40">
                  <h3 class="font-bold text-gray-800 dark:text-white text-sm">Passenger Details</h3>
                  <p class="text-xs text-gray-400 mt-0.5">Add name &amp; age for each seat</p>
                </div>
                <div class="divide-y divide-gray-100 dark:divide-slate-700">
                  @for (seat of selectedSeats(); track seat; let i = $index) {
                    <div class="p-4 space-y-2">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{{ i + 1 }}</span>
                        <span class="text-xs font-semibold text-slate-700 dark:text-slate-200">Seat {{ seat }}</span>
                        <span class="text-[10px] text-slate-400 ml-auto">{{ seatTypeLabel(seat) }}</span>
                      </div>
                      <input
                        [value]="passengerNames()[i] ?? ''"
                        (input)="setPassengerName(i, $any($event.target).value)"
                        type="text" placeholder="Full name *" maxlength="150"
                        class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                        [class.border-red-400]="nameErrors()[i]"/>
                      @if (nameErrors()[i]) {
                        <p class="text-xs text-red-500">Name is required</p>
                      }
                      <input
                        [value]="passengerAges()[i] ?? ''"
                        (input)="setPassengerAge(i, $any($event.target).value)"
                        type="number" placeholder="Age (optional)" min="0" max="120"
                        class="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"/>
                    </div>
                  }
                </div>
              </div>
            }

            <button (click)="proceed()" [disabled]="selectedSeats().length === 0 || holdExpired()"
              class="w-full py-4 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none text-base">
              @if (holdExpired()) { Hold expired � please reselect seats }
              @else if (selectedSeats().length === 0) { Select seats to continue }
              @else { Continue with {{ selectedSeats().length }} seat{{ selectedSeats().length !== 1 ? 's' : '' }} }
            </button>
            <p class="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
              100% Secure & Encrypted Payment
            </p>
          </div>
        </div>
      </div>
    }
  </div>
  `,
})
export class SeatSelectionComponent implements OnInit, OnDestroy {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private scheduleSvc = inject(ScheduleService);
  private bookingState = inject(BookingStateService);
  private toast = inject(ToastService);

  loading = signal(true);
  availability = signal<SeatAvailabilityResponse | null>(null);
  selectedSeats = signal<string[]>([]);
  draft = this.bookingState.draft;
  holdSeconds = signal(600); // 10 min hold
  private holdTimer: any;

  // Passenger quick-entry state
  passengerNames = signal<string[]>([]);
  passengerAges  = signal<(number | null)[]>([]);
  nameErrors     = signal<boolean[]>([]);

  total = computed(() => this.selectedSeats().length * (this.draft()?.schedule?.basePrice ?? 0));
  holdExpired = computed(() => this.holdSeconds() === 0);
  passengersValid = computed(() => {
    const seats = this.selectedSeats();
    const names = this.passengerNames();
    return seats.every((_, i) => (names[i] ?? '').trim().length > 0);
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('scheduleId')!;
    if (!this.draft()) {
      this.scheduleSvc.getById(id).subscribe({ next: s => this.bookingState.setSchedule(s), error: () => {} });
    }
    this.scheduleSvc.getSeatAvailability(id).subscribe({
      next: d => { this.availability.set(d); this.loading.set(false); this.startHoldTimer(); },
      error: () => { this.loading.set(false); this.toast.error('Failed to load seat availability.'); },
    });
  }

  ngOnDestroy() { if (this.holdTimer) clearInterval(this.holdTimer); }

  startHoldTimer() {
    this.holdTimer = setInterval(() => {
      this.holdSeconds.update(s => {
        if (s <= 1) {
          clearInterval(this.holdTimer);
          this.selectedSeats.set([]);
          this.toast.error('Seat hold expired. Please reselect your seats.');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  formatHoldTime(): string {
    const s = this.holdSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ':' + String(sec).padStart(2, '0');
  }

  // Build 4-column rows: A B | C D
  seatRows(): { rowNum: number; a: string; b: string; c: string; d: string }[] {
    const av = this.availability();
    if (!av) return [];
    const all = [...av.availableSeats, ...av.bookedSeats].sort((a, b) => {
      const na = parseInt(a), nb = parseInt(b);
      return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b);
    });
    const rows = [];
    for (let i = 0; i < all.length; i += 4) {
      rows.push({ rowNum: Math.floor(i / 4) + 1, a: all[i] ?? '', b: all[i+1] ?? '', c: all[i+2] ?? '', d: all[i+3] ?? '' });
    }
    return rows;
  }

  isBooked(seat: string) { return !seat || (this.availability()?.bookedSeats.includes(seat) ?? false); }
  isSelected(seat: string) { return !!seat && this.selectedSeats().includes(seat); }

  seatBtnClass(seat: string, type: 'window' | 'aisle' = 'aisle'): string {
    if (!seat) return 'h-10 rounded-lg opacity-0 cursor-default';
    if (this.isBooked(seat)) return 'h-10 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-slate-600 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-500 cursor-not-allowed flex items-center justify-center';
    if (this.isSelected(seat)) return 'h-10 rounded-lg text-xs font-bold bg-red-600 text-white border border-red-600 shadow-md shadow-red-200 cursor-pointer transition-all active:scale-95 flex items-center justify-center';
    if (type === 'window') return 'h-10 rounded-lg text-xs font-semibold border-2 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 cursor-pointer transition-all active:scale-95 flex items-center justify-center';
    return 'h-10 rounded-lg text-xs font-semibold border border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 cursor-pointer transition-all active:scale-95 flex items-center justify-center';
  }

  toggleSeat(seat: string) {
    if (!seat || this.isBooked(seat)) return;
    this.selectedSeats.update(s => {
      if (s.includes(seat)) {
        const idx = s.indexOf(seat);
        // Remove passenger data for this seat
        this.passengerNames.update(n => { const c = [...n]; c.splice(idx, 1); return c; });
        this.passengerAges.update(a => { const c = [...a]; c.splice(idx, 1); return c; });
        this.nameErrors.update(e => { const c = [...e]; c.splice(idx, 1); return c; });
        return s.filter(x => x !== seat);
      }
      if (s.length >= 6) { this.toast.error('Maximum 6 seats per booking.'); return s; }
      // Add empty passenger slot
      this.passengerNames.update(n => [...n, '']);
      this.passengerAges.update(a => [...a, null]);
      this.nameErrors.update(e => [...e, false]);
      return [...s, seat];
    });
  }

  setPassengerName(index: number, value: string) {
    this.passengerNames.update(n => { const c = [...n]; c[index] = value; return c; });
    this.nameErrors.update(e => { const c = [...e]; c[index] = !value.trim(); return c; });
  }

  setPassengerAge(index: number, value: string) {
    const num = value ? parseInt(value, 10) : null;
    this.passengerAges.update(a => { const c = [...a]; c[index] = isNaN(num as number) ? null : num; return c; });
  }

  proceed() {
    if (this.selectedSeats().length === 0 || this.holdExpired()) return;
    // Validate names
    const errors = this.passengerNames().map(n => !n.trim());
    this.nameErrors.set(errors);
    if (errors.some(Boolean)) { this.toast.error('Please fill in all passenger names.'); return; }
    if (this.holdTimer) clearInterval(this.holdTimer);
    this.bookingState.setSeats(this.selectedSeats());
    // Pre-fill passenger data into booking state so passenger form is pre-populated
    const passengers = this.selectedSeats().map((seat, i) => ({
      name: this.passengerNames()[i] ?? '',
      age: this.passengerAges()[i] ?? undefined,
      seatNo: seat,
    }));
    this.bookingState.setPassengers(passengers);
    this.router.navigate(['/booking/passengers', this.route.snapshot.paramMap.get('scheduleId')!]);
  }

  formatTime(utc: string) {
    return new Date(utc).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  goBack() { this.location.back(); }

  // A and D columns (positions 0 and 3 in each row of 4) are window seats
  seatTypeLabel(seat: string): string {
    const av = this.availability();
    if (!av) return '';
    const all = [...av.availableSeats, ...av.bookedSeats].sort((a, b) => {
      const na = parseInt(a), nb = parseInt(b);
      return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b);
    });
    const idx = all.indexOf(seat);
    if (idx < 0) return '';
    const col = idx % 4; // 0=A, 1=B, 2=C, 3=D
    return col === 0 || col === 3 ? 'Window' : 'Aisle';
  }
}
