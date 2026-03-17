import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookingService, BookingPassengerDto } from '../../../services/booking.service';
import { BookingStateService } from '../../../services/booking-state.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-passenger-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <section class="min-h-screen w-full bg-[#121212] text-white flex justify-center items-start py-10 px-4">
      <div class="w-full max-w-3xl space-y-6">

        <!-- Back -->
        <button (click)="goBack()"
                class="flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline mb-4">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back to seats
        </button>

        <!-- Heading -->
        <div class="text-center mb-6">
          <h1 class="text-2xl font-extrabold tracking-tight">Passenger Details</h1>
          @if (draft()) {
            <p class="text-gray-400 mt-1">
              Bus <span class="font-semibold">{{ draft()!.schedule.busCode }}</span>
              · {{ draft()!.schedule.routeCode }}
              · {{ formatTime(draft()!.schedule.departureUtc) }}
            </p>
            <p class="text-sm text-gray-500 mt-1">
              Seats: <span class="font-semibold text-[var(--accent)]">{{ draft()!.selectedSeats.join(', ') }}</span>
              · Total: <span class="font-bold">₹{{ draftTotal() }}</span>
            </p>
          }
        </div>

        <!-- Form card -->
        <div class="card bg-[#1E1E1E] border border-gray-700">
          <div class="card-body">
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <div formArrayName="passengers" class="space-y-4">
                @for (passengerGroup of passengersArray.controls; track $index) {
                  <div [formGroupName]="$index" class="rounded-xl border border-gray-600 p-4">
                    <div class="flex items-center gap-2 mb-3">
                      <div class="w-7 h-7 bg-gray-600 rounded-md flex items-center justify-center">
                        <span class="text-white text-xs font-bold">{{ $index + 1 }}</span>
                      </div>
                      <h3 class="font-semibold">
                        Passenger {{ $index + 1 }}
                        <span class="text-[var(--accent)] text-sm font-normal ml-1">
                          — Seat {{ draft()?.selectedSeats?.[$index] }}
                        </span>
                      </h3>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div class="sm:col-span-2">
                        <label class="label">Full Name *</label>
                        <input formControlName="name" type="text" placeholder="Enter full name" class="input"
                               [class.border-red-500]="isFieldInvalid($index, 'name')"/>
                        @if (isFieldInvalid($index, 'name')) {
                          <p class="mt-1 text-xs text-red-600">Name is required</p>
                        }
                      </div>

                      <div>
                        <label class="label">Age (optional)</label>
                        <input formControlName="age" type="number" placeholder="e.g. 25" min="0" max="120" class="input"/>
                      </div>

                      <div>
                        <label class="label">Seat No</label>
                        <input formControlName="seatNo" type="text" class="input" readonly/>
                      </div>
                    </div>
                  </div>
                }
              </div>

              @if (errorMsg()) {
                <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {{ errorMsg() }}
                </div>
              }

              <button type="submit" [disabled]="loading()" class="btn btn-primary w-full mt-4">
                @if (loading()) {
                  <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Booking...
                } @else {
                  Confirm Booking →
                }
              </button>
            </form>
          </div>
        </div>

      </div>
    </section>
  `,
})
export class PassengerFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookingService = inject(BookingService);
  private bookingState = inject(BookingStateService);
  private toast = inject(ToastService);

  loading = signal(false);
  errorMsg = signal('');
  draft = this.bookingState.draft;

  form = this.fb.group({
    passengers: this.fb.array([]),
  });

  get passengersArray(): FormArray {
    return this.form.get('passengers') as FormArray;
  }

  ngOnInit(): void {
    const d = this.draft();
    if (!d || d.selectedSeats.length === 0) {
      this.router.navigate(['/home']);
      return;
    }
    // Build passenger groups from selected seats
    d.selectedSeats.forEach(seat => {
      this.passengersArray.push(this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(150)]],
        age: [null, [Validators.min(0), Validators.max(120)]],
        seatNo: [seat],
      }));
    });
  }

  isFieldInvalid(index: number, field: string): boolean {
    const c = this.passengersArray.at(index)?.get(field);
    return !!(c?.invalid && c?.touched);
  }

  draftTotal(): number {
    const d = this.draft();
    return (d?.selectedSeats.length ?? 0) * (d?.schedule?.basePrice ?? 0);
  }

  goBack(): void {
    const scheduleId = this.route.snapshot.paramMap.get('scheduleId')!;
    this.router.navigate(['/booking/seats', scheduleId]);
  }

  formatTime(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const d = this.draft()!;
    const scheduleId = this.route.snapshot.paramMap.get('scheduleId') ?? d.schedule.id;
    if (!scheduleId) {
      this.errorMsg.set('Missing schedule identifier.');
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    const passengers: BookingPassengerDto[] = this.passengersArray.value.map((p: any) => ({
      name: p.name,
      age: p.age ?? undefined,
      seatNo: p.seatNo,
    }));

    this.bookingService.create({
      scheduleId: scheduleId,
      passengers,
    }).subscribe({
      next: (booking) => {
        this.bookingState.setPassengers(passengers);
        this.toast.success('Booking created! Please complete payment.');
        this.router.navigate(['/booking/confirm', booking.id]);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message ?? err?.error ?? `Booking failed (HTTP ${err?.status ?? 0}).`;
        this.errorMsg.set(msg);
      },
    });
  }
}