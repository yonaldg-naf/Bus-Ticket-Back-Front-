import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService, BookingPassengerDto } from '../../../services/booking.service';
import { BookingStateService } from '../../../services/booking-state.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { PromoCodeService, ValidatePromoResponse } from '../../../services/promo-code.service';

@Component({
  selector: 'app-passenger-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <button (click)="goBack()"
          class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-500 dark:text-slate-300 hover:text-red-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 class="text-lg font-extrabold text-slate-900 dark:text-white">Passenger Details</h1>
          @if (draft()) {
            <p class="text-sm text-slate-500 dark:text-slate-400">
              <span class="font-semibold text-slate-700 dark:text-slate-200">{{ draft()!.schedule.busCode }}</span>
              <span class="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              {{ draft()!.schedule.routeCode }}
              <span class="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              {{ formatTime(draft()!.schedule.departureUtc) }}
            </p>
          }
        </div>
      </div>
      <div class="max-w-7xl mx-auto px-4 sm:px-6 pb-3">
        <div class="flex items-center gap-2">
          <div class="step-done"><span class="step-dot-done">✓</span><span class="hidden sm:inline">Select Seats</span></div>
          <div class="flex-1 h-0.5 bg-green-300 rounded"></div>
          <div class="step-active"><span class="step-dot-active">2</span><span class="hidden sm:inline">Passenger Details</span></div>
          <div class="flex-1 h-0.5 bg-gray-200 rounded"></div>
          <div class="step-pending"><span class="step-dot-pending">3</span><span class="hidden sm:inline">Payment</span></div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Passenger Forms -->
        <div class="lg:col-span-2 space-y-4">
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div formArrayName="passengers" class="space-y-5">
              @for (pg of passengersArray.controls; track $index) {
                <div [formGroupName]="$index" class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div class="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/40 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{{ $index + 1 }}</div>
                      <div>
                        <p class="font-semibold text-slate-800 dark:text-white text-sm">Passenger {{ $index + 1 }}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Seat <span class="font-semibold text-red-600">{{ draft()?.selectedSeats?.[$index] }}</span></p>
                      </div>
                    </div>
                    @if ($index === 0) {
                      <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                        <button type="button" (click)="setBookingFor($index, 'self')"
                          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                          [class]="bookingFor()[$index] === 'self' ? 'bg-white dark:bg-slate-600 text-red-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'">
                          Me
                        </button>
                        <button type="button" (click)="setBookingFor($index, 'other')"
                          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                          [class]="bookingFor()[$index] === 'other' ? 'bg-white dark:bg-slate-600 text-red-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'">
                          Someone else
                        </button>
                      </div>
                    }
                    @if ($index > 0) {
                      <span class="text-xs text-slate-400 dark:text-slate-500">Other passenger</span>
                    }
                  </div>
                  @if ($index === 0 && bookingFor()[$index] === 'self') {
                    <div class="px-5 py-3 bg-red-50/50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20 flex items-center gap-2.5">
                      <div class="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{{ currentUserInitial() }}</div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-slate-800 dark:text-white">{{ auth.currentUser()?.fullName }}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Your details have been filled in automatically</p>
                      </div>
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
                      <label class="form-label">Age <span class="text-slate-400 font-normal">(optional)</span></label>
                      <input formControlName="age" type="number" placeholder="25" min="0" max="120" class="form-input"/>
                    </div>
                    <div>
                      <label class="form-label">Seat No</label>
                      <input formControlName="seatNo" type="text" class="form-input bg-slate-50 dark:bg-slate-600 text-slate-500 dark:text-slate-400" readonly/>
                    </div>
                  </div>
                </div>
              }
            </div>

            @if (errorMsg()) {
              <div class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mt-4">
                <p class="text-sm text-red-700">{{ errorMsg() }}</p>
              </div>
            }

            <!-- Promo Code with live validation -->
            <div class="mt-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Promo Code (optional)</label>
              <div class="flex gap-2">
                <input [(ngModel)]="promoCode" [ngModelOptions]="{standalone: true}"
                  placeholder="Enter promo code" maxlength="50"
                  [disabled]="!!validatedPromo()"
                  class="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 uppercase transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-600 disabled:text-slate-400"/>
                @if (!validatedPromo()) {
                  <button type="button" (click)="validatePromo()" [disabled]="promoValidating() || !promoCode.trim()"
                    class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap">
                    {{ promoValidating() ? 'Checking…' : 'Apply' }}
                  </button>
                } @else {
                  <button type="button" (click)="removePromo()"
                    class="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap">
                    Remove
                  </button>
                }
              </div>
              @if (validatedPromo()) {
                <div class="mt-2 flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <svg class="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-xs font-semibold text-green-700 dark:text-green-400">{{ validatedPromo()!.code }}</span>
                  <span class="text-xs text-green-600 dark:text-green-500">— saves ₹{{ validatedPromo()!.discountAmount | number:'1.0-0' }}</span>
                </div>
              }
              @if (promoError()) {
                <p class="mt-1.5 text-xs text-red-500">{{ promoError() }}</p>
              }
            </div>

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
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 sticky top-20">
            <h3 class="font-semibold text-slate-800 dark:text-white mb-4">Booking Summary</h3>
            @if (draft()) {
              <div class="space-y-2.5 text-sm mb-4">
                <div class="flex justify-between">
                  <span class="text-slate-500 dark:text-slate-400">Bus</span>
                  <span class="font-medium text-slate-800 dark:text-white">{{ draft()!.schedule.busCode }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500 dark:text-slate-400">Route</span>
                  <span class="font-medium text-slate-800 dark:text-white">{{ draft()!.schedule.routeCode }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500 dark:text-slate-400">Departure</span>
                  <span class="font-medium text-slate-800 dark:text-white text-right text-xs">{{ formatTime(draft()!.schedule.departureUtc) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500 dark:text-slate-400">Seats</span>
                  <span class="font-medium text-red-600">{{ draft()!.selectedSeats.join(', ') }}</span>
                </div>
                <div class="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                  @if (validatedPromo()) {
                    <div class="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                      <span>Subtotal</span>
                      <span>₹{{ draftTotal() | number:'1.0-0' }}</span>
                    </div>
                    <div class="flex justify-between text-sm text-green-600 font-medium">
                      <span>Promo ({{ validatedPromo()!.code }})</span>
                      <span>-₹{{ validatedPromo()!.discountAmount | number:'1.0-0' }}</span>
                    </div>
                  }
                  <div class="flex justify-between font-bold text-slate-900 dark:text-white text-base pt-1">
                    <span>Total</span>
                    <span class="text-red-600">₹{{ finalTotal() | number:'1.0-0' }}</span>
                  </div>
                </div>
              </div>
            }
            <div class="p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl">
              <p class="text-xs text-slate-600 dark:text-slate-300">
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
  private promoSvc     = inject(PromoCodeService);
  auth                 = inject(AuthService);

  loading          = signal(false);
  errorMsg         = signal('');
  draft            = this.bookingState.draft;
  promoCode        = '';
  promoValidating  = signal(false);
  validatedPromo   = signal<ValidatePromoResponse | null>(null);
  promoError       = signal('');
  bookingFor       = signal<('self' | 'other')[]>([]);

  form = this.fb.group({ passengers: this.fb.array([]) });
  get passengersArray(): FormArray { return this.form.get('passengers') as FormArray; }

  currentUserInitial() { return (this.auth.currentUser()?.fullName ?? 'U')[0].toUpperCase(); }

  ngOnInit() {
    const d = this.draft();
    if (!d || d.selectedSeats.length === 0) { this.router.navigate(['/home']); return; }
    const defaults: ('self' | 'other')[] = d.selectedSeats.map((_, i) => i === 0 ? 'self' : 'other');
    this.bookingFor.set(defaults);
    d.selectedSeats.forEach((seat, i) => {
      // Use pre-filled passenger data from seat selection if available
      const prefilled = d.passengers?.[i];
      const name = prefilled?.name || (i === 0 ? (this.auth.currentUser()?.fullName ?? '') : '');
      const age  = prefilled?.age ?? null;
      this.passengersArray.push(this.fb.group({
        name:   [name, [Validators.required, Validators.maxLength(150)]],
        age:    [age,  [Validators.min(0), Validators.max(120)]],
        seatNo: [seat],
      }));
    });
  }

  setBookingFor(index: number, value: 'self' | 'other') {
    this.bookingFor.update(arr => { const c = [...arr]; c[index] = value; return c; });
    const control = this.passengersArray.at(index)?.get('name');
    if (!control) return;
    if (value === 'self') { control.setValue(this.auth.currentUser()?.fullName ?? ''); control.disable(); }
    else {
      // Only clear if it was the user's own name
      const currentVal = control.value;
      const myName = this.auth.currentUser()?.fullName ?? '';
      if (currentVal === myName) control.setValue('');
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

  finalTotal() {
    return Math.max(0, this.draftTotal() - (this.validatedPromo()?.discountAmount ?? 0));
  }

  validatePromo() {
    const code = this.promoCode.trim().toUpperCase();
    if (!code) return;
    this.promoValidating.set(true);
    this.promoError.set('');
    this.promoSvc.validate(code, this.draftTotal()).subscribe({
      next: (r: ValidatePromoResponse) => {
        this.promoValidating.set(false);
        if (r.isValid) { this.validatedPromo.set(r); this.promoCode = r.code; }
        else { this.promoError.set(r.message ?? 'Invalid promo code.'); }
      },
      error: (err: any) => {
        this.promoValidating.set(false);
        this.promoError.set(err?.error?.message ?? 'Could not validate promo code.');
      },
    });
  }

  removePromo() { this.validatedPromo.set(null); this.promoError.set(''); this.promoCode = ''; }

  goBack() { this.router.navigate(['/booking/seats', this.route.snapshot.paramMap.get('scheduleId')!]); }

  formatTime(utc: string) {
    return new Date(utc).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  onSubmit() {
    this.passengersArray.controls.forEach(c => c.get('name')?.enable());
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const d = this.draft()!;
    const scheduleId = this.route.snapshot.paramMap.get('scheduleId') ?? d.schedule.id;
    if (!scheduleId) { this.errorMsg.set('Missing schedule identifier.'); return; }
    this.loading.set(true);
    this.errorMsg.set('');
    const passengers: BookingPassengerDto[] = this.passengersArray.value.map((p: any) => ({
      name: p.name, age: p.age ?? undefined, seatNo: p.seatNo,
    }));
    this.bookingSvc.create({ scheduleId, passengers, promoCode: this.validatedPromo()?.code || undefined }).subscribe({
      next: booking => {
        this.bookingState.setPassengers(passengers);
        this.toast.success('Booking created! Complete payment to confirm.');
        this.router.navigate(['/booking/confirm', booking.id]);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.message ?? err?.error ?? `Booking failed (HTTP ${err?.status ?? 0}).`);
      },
    });
  }
}
