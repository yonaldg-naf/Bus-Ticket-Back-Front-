import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StopService } from '../../services/stop.service';

interface CityResponse { city: string; stopCount: number; }

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
  <div class="min-h-screen bg-gray-50">

    <!-- Hero -->
    <section class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div class="text-center mb-8">
          <h1 class="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Book Bus Tickets <span class="text-red-600">Instantly</span>
          </h1>
          <p class="text-gray-500 mt-3 text-base sm:text-lg max-w-xl mx-auto">
            Trusted by millions — search, compare and book from 10,000+ routes across India.
          </p>
        </div>

        <!-- Search Card -->
        <div class="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-lg p-5 sm:p-7">
          <form [formGroup]="form" (ngSubmit)="onSearch()">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  <svg class="inline w-3.5 h-3.5 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
                  From
                </label>
                <select formControlName="fromCity"
                  class="w-full px-3 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm transition-colors">
                  <option value="">Select city</option>
                  @for (c of cities(); track c.city) { <option [value]="c.city">{{ c.city }}</option> }
                </select>
                @if (isInvalid('fromCity')) { <p class="text-red-500 text-xs mt-1">Required</p> }
              </div>

              <!-- Swap icon -->
              <div class="relative">
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  <svg class="inline w-3.5 h-3.5 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
                  To
                </label>
                <select formControlName="toCity"
                  class="w-full px-3 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm transition-colors">
                  <option value="">Select city</option>
                  @for (c of cities(); track c.city) { <option [value]="c.city">{{ c.city }}</option> }
                </select>
                @if (isInvalid('toCity')) { <p class="text-red-500 text-xs mt-1">Required</p> }
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  <svg class="inline w-3.5 h-3.5 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  Date
                </label>
                <input formControlName="date" type="date" [min]="today"
                  class="w-full px-3 py-3 rounded-xl border border-gray-300 bg-white text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm transition-colors"/>
                @if (isInvalid('date')) { <p class="text-red-500 text-xs mt-1">Required</p> }
              </div>

              <div class="flex flex-col justify-end">
                <button type="submit"
                  class="w-full py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700
                         active:scale-95 transition-all shadow-sm shadow-red-200 flex items-center justify-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  Search Buses
                </button>
              </div>
            </div>
            @if (sameCityError()) {
              <p class="text-red-600 text-sm mt-3 flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                From and To cities cannot be the same
              </p>
            }
          </form>
        </div>
      </div>
    </section>

    <!-- Features strip -->
    <section class="bg-red-600 py-4">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex flex-wrap justify-center gap-8 text-white text-sm font-medium">
          <span class="flex items-center gap-2"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>Instant Confirmation</span>
          <span class="flex items-center gap-2"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>Secure Payments</span>
          <span class="flex items-center gap-2"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>Choose Your Seat</span>
          <span class="flex items-center gap-2"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>E-Ticket / M-Ticket</span>
          <span class="flex items-center gap-2"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>24/7 Support</span>
        </div>
      </div>
    </section>

    <!-- Why choose us -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <h2 class="text-2xl font-bold text-gray-900 text-center mb-10">Why millions choose SwiftRoute</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (f of features; track f.title) {
          <div class="bg-white rounded-2xl border border-gray-200 p-6 text-center hover:shadow-md hover:border-red-200 transition-all">
            <div class="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-2xl" [class]="f.bg">{{ f.icon }}</div>
            <h3 class="font-bold text-gray-900 mb-1">{{ f.title }}</h3>
            <p class="text-sm text-gray-500">{{ f.desc }}</p>
          </div>
        }
      </div>
    </section>

    <!-- Stats banner -->
    <section class="bg-gray-900 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          @for (s of stats; track s.label) {
            <div>
              <p class="text-3xl font-extrabold text-white">{{ s.value }}</p>
              <p class="text-gray-400 text-sm mt-1">{{ s.label }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"/>
            </svg>
          </div>
          <span class="font-bold text-gray-900">SwiftRoute</span>
        </div>
        <p class="text-sm text-gray-400">© 2026 SwiftRoute Technologies. All rights reserved.</p>
      </div>
    </footer>
  </div>
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

  features = [
    { icon: '⚡', bg: 'bg-yellow-50', title: 'Fast Booking', desc: 'Book your seat in under 2 minutes with instant confirmation.' },
    { icon: '💺', bg: 'bg-blue-50', title: 'Seat Selection', desc: 'Pick your preferred seat from a live layout view.' },
    { icon: '🔒', bg: 'bg-green-50', title: 'Secure Payments', desc: 'PCI-DSS compliant payments. Your data is safe.' },
    { icon: '📱', bg: 'bg-purple-50', title: 'E-Tickets', desc: 'Paperless boarding with mobile ticket support.' },
  ];

  stats = [
    { value: '2M+', label: 'Happy Travelers' },
    { value: '500+', label: 'Bus Operators' },
    { value: '10K+', label: 'Routes Available' },
    { value: '99.9%', label: 'Uptime Guarantee' },
  ];

  ngOnInit() {
    this.stopService.getCities().subscribe({
      next: d => { this.cities.set(d); this.loadingCities.set(false); },
      error: () => this.loadingCities.set(false),
    });
  }

  isInvalid(f: string) { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }

  onSearch() {
    this.sameCityError.set(false);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { fromCity, toCity, date } = this.form.value;
    if (fromCity === toCity) { this.sameCityError.set(true); return; }
    this.router.navigate(['/search'], { queryParams: { from: fromCity, to: toCity, date } });
  }
}