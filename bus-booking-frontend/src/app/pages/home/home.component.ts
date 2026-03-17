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
  <section class="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#0f0f10] px-4 relative overflow-hidden">

    <!-- Background glow -->
    <div class="absolute w-[600px] h-[600px] bg-[#D32F2F]/20 blur-[140px] rounded-full -top-40 -left-40"></div>
    <div class="absolute w-[400px] h-[400px] bg-[#ff5252]/10 blur-[120px] rounded-full bottom-0 right-0"></div>

    <div class="w-full max-w-5xl text-center relative z-10">

      <!-- Heading -->
      <h1 class="text-4xl sm:text-5xl font-bold text-white tracking-tight">
        Book Bus Tickets Easily
      </h1>

      <p class="text-gray-400 mt-3 text-base sm:text-lg">
        Search, compare and travel across India with confidence.
      </p>

      <!-- Search Card -->
      <div class="mt-10 bg-[#161618] border border-[#2a2a2d] rounded-2xl shadow-2xl p-6 sm:p-8">

        <form [formGroup]="form" (ngSubmit)="onSearch()">

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            <!-- From -->
            <div class="text-left">
              <label class="text-xs text-gray-400">From</label>
              <select formControlName="fromCity"
                class="w-full mt-1 px-4 py-3 rounded-lg bg-[#0f0f10] border border-[#2a2a2d]
                       text-white focus:outline-none focus:ring-2 focus:ring-[#D32F2F]">
                <option value="">Select city</option>
                @for (c of cities(); track c.city) {
                  <option [value]="c.city">{{ c.city }}</option>
                }
              </select>

              @if (isInvalid('fromCity')) {
                <p class="text-xs text-red-500 mt-1">Select departure city</p>
              }
            </div>

            <!-- To -->
            <div class="text-left">
              <label class="text-xs text-gray-400">To</label>
              <select formControlName="toCity"
                class="w-full mt-1 px-4 py-3 rounded-lg bg-[#0f0f10] border border-[#2a2a2d]
                       text-white focus:outline-none focus:ring-2 focus:ring-[#D32F2F]">
                <option value="">Select city</option>
                @for (c of cities(); track c.city) {
                  <option [value]="c.city">{{ c.city }}</option>
                }
              </select>

              @if (isInvalid('toCity')) {
                <p class="text-xs text-red-500 mt-1">Select destination city</p>
              }
            </div>

            <!-- Date -->
            <div class="text-left">
              <label class="text-xs text-gray-400">Date</label>
              <input formControlName="date" type="date"
                [min]="today"
                class="w-full mt-1 px-4 py-3 rounded-lg bg-[#0f0f10] border border-[#2a2a2d]
                       text-white focus:outline-none focus:ring-2 focus:ring-[#D32F2F]" />

              @if (isInvalid('date')) {
                <p class="text-xs text-red-500 mt-1">Select a date</p>
              }
            </div>

            <!-- Button -->
            <div class="flex items-end">
              <button type="submit"
                class="w-full py-3 rounded-lg text-white font-semibold
                       bg-gradient-to-r from-[#D32F2F] to-[#7f1d1d]
                       hover:opacity-90 active:scale-95 transition shadow-lg">
                Search
              </button>
            </div>

          </div>

          @if (sameCityError()) {
            <p class="text-red-500 text-sm mt-3">From and To cities cannot be the same</p>
          }

        </form>
      </div>

      <!-- Features -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-12">

        <div class="bg-[#161618] border border-[#2a2a2d] rounded-xl p-4 text-center">
          <div class="text-xl mb-1">⚡</div>
          <div class="text-white font-medium">Fast Booking</div>
          <div class="text-xs text-gray-500 mt-1">Instant confirmation</div>
        </div>

        <div class="bg-[#161618] border border-[#2a2a2d] rounded-xl p-4 text-center">
          <div class="text-xl mb-1">💺</div>
          <div class="text-white font-medium">Seat Choice</div>
          <div class="text-xs text-gray-500 mt-1">Pick your seat</div>
        </div>

        <div class="bg-[#161618] border border-[#2a2a2d] rounded-xl p-4 text-center">
          <div class="text-xl mb-1">🔒</div>
          <div class="text-white font-medium">Secure Pay</div>
          <div class="text-xs text-gray-500 mt-1">Encrypted payments</div>
        </div>

        <div class="bg-[#161618] border border-[#2a2a2d] rounded-xl p-4 text-center">
          <div class="text-xl mb-1">📱</div>
          <div class="text-white font-medium">E-Tickets</div>
          <div class="text-xs text-gray-500 mt-1">Paperless travel</div>
        </div>

      </div>

      <!-- Loader -->
      @if (loadingCities()) {
        <div class="flex justify-center mt-10">
          <svg class="animate-spin w-8 h-8 text-[#D32F2F]" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"/>
          </svg>
        </div>
      }

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
  today = new Date().toISOString().split('T')[0]; // ensures min date works

  form = this.fb.group({
    fromCity: ['', Validators.required],
    toCity: ['', Validators.required],
    date: [this.today, Validators.required],
  });

  ngOnInit(): void {
    this.stopService.getCities().subscribe({
      next: (data) => {
        this.cities.set(data);
        this.loadingCities.set(false);
      },
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

    this.router.navigate(['/search'], {
      queryParams: { from: fromCity, to: toCity, date },
    });
  }
}