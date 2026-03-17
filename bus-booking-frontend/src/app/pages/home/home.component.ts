import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StopService } from '../../services/stop.service';

interface CityResponse {
  city: string;
  stopCount: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <!-- Viewport wrapper: full height minus sticky navbar (64px) -->
    <section class="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div class="container max-w-5xl w-full">
        <!-- Centered block -->
        <div class="max-w-4xl mx-auto text-center">
          <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight">
            Book Bus Tickets Online
          </h1>
          <p class="text-muted text-base sm:text-lg mt-2">
            Search, compare and book bus tickets across India in seconds.
          </p>

          <!-- Search Card -->
          <div class="card card-soft mt-8">
            <div class="card-body">
              <form [formGroup]="form" (ngSubmit)="onSearch()">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <!-- From City -->
                  <div>
                    <label class="label">From</label>
                    <select formControlName="fromCity" class="input bg-white">
                      <option value="">Select city</option>
                      @for (c of cities(); track c.city) {
                        <option [value]="c.city">{{ c.city }}</option>
                      }
                    </select>
                    @if (isInvalid('fromCity')) {
                      <p class="mt-1 text-xs text-red-600">Select departure city</p>
                    }
                  </div>

                  <!-- To City -->
                  <div>
                    <label class="label">To</label>
                    <select formControlName="toCity" class="input bg-white">
                      <option value="">Select city</option>
                      @for (c of cities(); track c.city) {
                        <option [value]="c.city">{{ c.city }}</option>
                      }
                    </select>
                    @if (isInvalid('toCity')) {
                      <p class="mt-1 text-xs text-red-600">Select destination city</p>
                    }
                  </div>

                  <!-- Date -->
                  <div>
                    <label class="label">Date</label>
                    <input formControlName="date" type="date" [min]="today" class="input" />
                    @if (isInvalid('date')) {
                      <p class="mt-1 text-xs text-red-600">Select a travel date</p>
                    }
                  </div>

                  <!-- CTA -->
                  <div class="flex items-end">
                    <button type="submit" class="btn btn-primary w-full">
                      Search buses
                    </button>
                  </div>
                </div>

                @if (sameCityError()) {
                  <p class="mt-3 text-sm text-red-600">⚠ From and To cities cannot be the same.</p>
                }
              </form>
            </div>
          </div>

          <!-- Features -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-5 text-center mt-10">
            <div class="card">
              <div class="card-body">
                <div class="text-2xl mb-1">⚡</div>
                <div class="font-semibold">Instant Booking</div>
                <div class="text-xs text-muted mt-1">Confirm in seconds</div>
              </div>
            </div>
            <div class="card">
              <div class="card-body">
                <div class="text-2xl mb-1">💺</div>
                <div class="font-semibold">Seat Selection</div>
                <div class="text-xs text-muted mt-1">Choose your seat</div>
              </div>
            </div>
            <div class="card">
              <div class="card-body">
                <div class="text-2xl mb-1">🔒</div>
                <div class="font-semibold">Secure Payments</div>
                <div class="text-xs text-muted mt-1">Safe & encrypted</div>
              </div>
            </div>
            <div class="card">
              <div class="card-body">
                <div class="text-2xl mb-1">📱</div>
                <div class="font-semibold">E‑Tickets</div>
                <div class="text-xs text-muted mt-1">Go paperless</div>
              </div>
            </div>
          </div>

          <!-- Loading -->
          @if (loadingCities()) {
            <div class="flex justify-center py-10">
              <svg class="animate-spin w-8 h-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
          }
        </div>
      </div>
    </section>
  `,
})
export class HomeComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private stopService = inject(StopService);

  cities = signal<CityResponse[]>([]);
  loadingCities = signal(true);
  sameCityError = signal(false);
  today = new Date().toISOString().split('T')[0];

  form = this.fb.group({
    fromCity: ['', Validators.required],
    toCity: ['', Validators.required],
    date: [this.today, Validators.required],
  });

  ngOnInit(): void {
    this.stopService.getCities().subscribe({
      next: (data) => { this.cities.set(data); this.loadingCities.set(false); },
      error: () => this.loadingCities.set(false),
    });
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  onSearch(): void {
    this.sameCityError.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fromCity, toCity, date } = this.form.value;
    if (fromCity === toCity) {
      this.sameCityError.set(true);
      return;
    }
    this.router.navigate(['/search'], { queryParams: { from: fromCity, to: toCity, date } });
  }
}
