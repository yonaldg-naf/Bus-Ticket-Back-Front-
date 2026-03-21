import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookingService, BookingPassengerDto } from '../../../services/booking.service';
import { BookingStateService } from '../../../services/booking-state.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-passenger-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
  <div class="min-h-screen bg-gray-50">

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <button (click)="goBack()"
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 class="text-lg font-bold text-gray-900">Passenger Details</h1>
          @if (draft()) {
            <p class="text-sm text-gray-500">
              <span class="font-semibold text-gray-800">{{ draft()!.schedule.busCode }}</span>
              · {{ draft()!.schedule.routeCode }}
              · {{ formatTime(draft()!.schedule.departureUtc) }}
            </p>
          }
        </div>
      </div>

      <!-- Steps -->
      <div class="max-w-5xl mx-auto px-4 sm:px-6 pb-3">
        <div class="flex items-center gap-2 text-xs">
          <span class="flex items-center gap-1.5 text-green-600 font-medium">
            <span class="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">✓</span>
            Select Seats
          </span>
          <div class="flex-1 h-px bg-red-300"></div>
          <span class="flex items-center gap-1.5 font-semibold text-red-600">
            <span class="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center">2</span>
            Passenger Details
          </span>
          <div class="flex-1 h-px bg-gray-200"></div>
          <span class="flex items-center gap-1.5 text-gray-400">
            <span class="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">3</span>
            Payment
          </span>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Passenger Forms -->
        <div class="lg:col-span-2 space-y-4">
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div formArrayName="passengers" class="space-y-5">
              @for (pg of passengersArray.controls; track $index) {
                <div [formGroupName]="$index" class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                  <!-- Passenger card header -->
                  <div class="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {{ $index + 1 }}
                      </div>
                      <div>
                        <p class="font-semibold text-gray-800 text-sm">Passenger {{ $index + 1 }}</p>
                        <p class="text-xs text-gray-500">Seat <span class="font-semibold text-red-600">{{ draft()?.selectedSeats?.[$index] }}</span></p>
                      </div>
                    </div>

                    <!-- Self / Someone else toggle — only for first passenger -->
                    @if ($index === 0) {
                      <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button type="button"
                          (click)="setBookingFor($index, 'self')"
                          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                          [class]="bookingFor()[$index] === 'self'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'">
                          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                          </svg>
                          Me
                        </button>
                        <button type="button"
                          (click)="setBookingFor($index, 'other')"
                          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                          [class]="bookingFor()[$index] === 'other'
                            ? 'bg-white text-red-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'">
                          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                          </svg>
                          Someone else
                        </button>
                      </div>
                    }

                    <!-- For other passengers: just someone else label -->
                    @if ($index > 0) {
                      <span class="text-xs text-gray-400 flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                        </svg>
                        Other passenger
                      </span>
                    }
                  </div>

                  <!-- "Booking for yourself" info strip -->
                  @if ($index === 0 && bookingFor()[$index] === 'self') {
                    <div class="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {{ currentUserInitial() }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-gray-800">{{ auth.currentUser()?.fullName }}</p>
                        <p class="text-xs text-gray-500">Your details have been filled in automatically</p>
                      </div>
                      <svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                    </div>
                  }

                  <div class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="sm:col-span-2">
                      <label class="form-label">Full Name *</label>
                      <input formControlName="name" type="text" placeholder="Enter full name" class="form-input"
                        [class.border-red-400]="isFieldInvalid($index, 'name')"
                        [readonly]="$index === 0 && bookingFor()[$index] === 'self'"/>
                      @if (isFieldInvalid($index, 'name')) {
                        <p class="form-error">Name is required</p>
                      }
                    </div>
                    <div>
                      <label class="form-label">Age <span class="text-gray-400 font-normal">(optional)</span></label>
                      <input formControlName="age" type="number" placeholder="25" min="0" max="120" class="form-input"/>
                    </div>
                    <div>
                      <label class="form-label">Seat No</label>
                      <input formControlName="seatNo" type="text" class="form-input bg-gray-50 text-gray-500" readonly/>
                    </div>
                  </div>
                </div>
              }
            </div>

            @if (errorMsg()) {
              <div class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mt-4">
                <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <p class="text-sm text-red-700">{{ errorMsg() }}</p>
              </div>
            }

            <button type="submit" [disabled]="loading()" class="btn-primary w-full py-3.5 text-base mt-5">
              @if (loading()) {
                <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Creating Booking…
              } @else {
                Confirm & Proceed to Payment →
              }
            </button>
          </form>
        </div>

        <!-- Booking Summary Sidebar -->
        <div class="space-y-4">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sticky top-20">
            <h3 class="font-semibold text-gray-800 mb-4">Booking Summary</h3>
            @if (draft()) {
              <div class="space-y-2.5 text-sm mb-4">
                <div class="flex justify-between">
                  <span class="text-gray-500">Bus</span>
                  <span class="font-medium text-gray-800">{{ draft()!.schedule.busCode }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Route</span>
                  <span class="font-medium text-gray-800">{{ draft()!.schedule.routeCode }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Departure</span>
                  <span class="font-medium text-gray-800 text-right text-xs">{{ formatTime(draft()!.schedule.departureUtc) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Seats</span>
                  <span class="font-medium text-red-600">{{ draft()!.selectedSeats.join(', ') }}</span>
                </div>
                <div class="pt-2 border-t border-gray-100 flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span class="text-red-600">₹{{ draftTotal() | number:'1.0-0' }}</span>
                </div>
              </div>
            }
            <div class="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p class="text-xs text-blue-700 flex items-start gap-1.5">
                <svg class="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                Payment is processed on the next screen after booking is confirmed.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
  `,
})
export class PassengerFormComponent implements OnInit {
  private fb           = inject(FormBuilder);
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private bookingSvc   = inject(BookingService);
  private bookingState = inject(BookingStateService);
  private toast        = inject(ToastService);
  auth                 = inject(AuthService);

  loading    = signal(false);
  errorMsg   = signal('');
  draft      = this.bookingState.draft;

  // Tracks "Me" or "Someone else" per passenger slot
  bookingFor = signal<('self' | 'other')[]>([]);

  form = this.fb.group({ passengers: this.fb.array([]) });

  get passengersArray(): FormArray { return this.form.get('passengers') as FormArray; }

  currentUserInitial() {
    return (this.auth.currentUser()?.fullName ?? 'U')[0].toUpperCase();
  }

  ngOnInit() {
    const d = this.draft();
    if (!d || d.selectedSeats.length === 0) { this.router.navigate(['/home']); return; }

    // Default: first seat = "Me", rest = "Someone else"
    const defaults: ('self' | 'other')[] = d.selectedSeats.map((_, i) => i === 0 ? 'self' : 'other');
    this.bookingFor.set(defaults);

    d.selectedSeats.forEach((seat, i) => {
      const name = i === 0 ? (this.auth.currentUser()?.fullName ?? '') : '';
      this.passengersArray.push(this.fb.group({
        name:   [name, [Validators.required, Validators.maxLength(150)]],
        age:    [null, [Validators.min(0), Validators.max(120)]],
        seatNo: [seat],
      }));
    });
  }

  setBookingFor(index: number, value: 'self' | 'other') {
    this.bookingFor.update(arr => {
      const copy = [...arr];
      copy[index] = value;
      return copy;
    });

    const control = this.passengersArray.at(index)?.get('name');
    if (!control) return;

    if (value === 'self') {
      // Auto-fill with logged-in user's name and make read-only
      control.setValue(this.auth.currentUser()?.fullName ?? '');
      control.disable();
    } else {
      // Clear and let user type
      control.setValue('');
      control.enable();
    }
  }

  isFieldInvalid(i: number, f: string) {
    const c = this.passengersArray.at(i)?.get(f);
    return !!(c?.invalid && c?.touched);
  }

  draftTotal() {
    const d = this.draft();
    return (d?.selectedSeats.length ?? 0) * (d?.schedule?.basePrice ?? 0);
  }

  goBack() { this.router.navigate(['/booking/seats', this.route.snapshot.paramMap.get('scheduleId')!]); }

  formatTime(utc: string) {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  onSubmit() {
    // Re-enable disabled controls so their values are included in form.value
    this.passengersArray.controls.forEach(c => c.get('name')?.enable());

    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const d = this.draft()!;
    const scheduleId = this.route.snapshot.paramMap.get('scheduleId') ?? d.schedule.id;
    if (!scheduleId) { this.errorMsg.set('Missing schedule identifier.'); return; }

    this.loading.set(true); this.errorMsg.set('');
    const passengers: BookingPassengerDto[] = this.passengersArray.value.map((p: any) => ({
      name: p.name, age: p.age ?? undefined, seatNo: p.seatNo,
    }));

    this.bookingSvc.create({ scheduleId, passengers }).subscribe({
      next: booking => {
        this.bookingState.setPassengers(passengers);
        this.toast.success('Booking created! Complete payment to confirm.');
        this.router.navigate(['/booking/confirm', booking.id]);
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? err?.error ?? `Booking failed (HTTP ${err?.status ?? 0}).`);
      },
    });
  }
}