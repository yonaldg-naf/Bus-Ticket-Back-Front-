import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StopService } from '../../services/stop.service';

interface CityResponse { city: string; stopCount: number; }

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <!-- ── Hero ── -->
    <section class="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <div class="absolute inset-0 opacity-5 pointer-events-none">
        <div class="absolute top-10 left-10 w-72 h-72 rounded-full border-[50px] border-white"></div>
        <div class="absolute bottom-0 right-20 w-96 h-96 rounded-full border-[60px] border-white"></div>
        <div class="absolute top-1/2 left-1/2 w-48 h-48 rounded-full border-[30px] border-white -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      <!-- Red accent line at top -->
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div class="flex justify-center mb-5">
          <span class="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-semibold border border-white/20">
            🚌 India's Fastest Growing Bus Platform
          </span>
        </div>

        <div class="text-center mb-10">
          <h1 class="text-4xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Book Your Bus<br/>
            <span class="text-red-400">Journey with Ease.</span>
          </h1>
          <p class="text-slate-300 mt-4 text-base sm:text-lg max-w-2xl mx-auto">
            Discover thousands of routes, compare fares, and reserve your seats in seconds. Travel smarter with BusGo.
          </p>
          <div class="flex flex-wrap justify-center gap-8 mt-8">
            @for (s of stats; track s.label) {
              <div class="text-center">
                <p class="text-2xl sm:text-3xl font-extrabold text-white">{{ s.value }}</p>
                <p class="text-slate-400 text-xs mt-0.5">{{ s.label }}</p>
              </div>
            }
          </div>
        </div>

        <!-- Search Card -->
        <div class="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
          <div class="flex items-center gap-2 mb-5">
            <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <h2 class="font-bold text-slate-900 dark:text-white">Find Your Bus</h2>
            <span class="text-sm text-slate-400 dark:text-slate-500 hidden sm:inline">Search from 500+ routes across India</span>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSearch()">
            <!-- Row 1: From / Swap / To -->
            <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 mb-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">From</label>
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                  </svg>
                  <select formControlName="fromCity" class="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm transition-colors appearance-none">
                    <option value="">Select departure city</option>
                    @for (c of cities(); track c.city) { <option [value]="c.city">{{ c.city }}</option> }
                  </select>
                </div>
                @if (isInvalid('fromCity')) { <p class="text-red-500 text-xs mt-1">Required</p> }
              </div>

              <!-- Swap button -->
              <div class="flex items-end pb-0.5">
                <button type="button" (click)="swapCities()"
                  class="w-10 h-10 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-all group"
                  title="Swap cities">
                  <svg class="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                  </svg>
                </button>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">To</label>
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                  </svg>
                  <select formControlName="toCity" class="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm transition-colors appearance-none">
                    <option value="">Select destination city</option>
                    @for (c of cities(); track c.city) { <option [value]="c.city">{{ c.city }}</option> }
                  </select>
                </div>
                @if (isInvalid('toCity')) { <p class="text-red-500 text-xs mt-1">Required</p> }
              </div>
            </div>

            <!-- Row 2: Date / Passengers / Search -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Travel Date</label>
                <div class="relative">
                  <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <input formControlName="date" type="date" [min]="today"
                    class="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm transition-colors"/>
                </div>
                @if (isInvalid('date')) { <p class="text-red-500 text-xs mt-1">Required</p> }
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Passengers</label>
                <div class="flex items-center border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden bg-white dark:bg-slate-700">
                  <button type="button" (click)="decPassengers()"
                    class="w-11 h-11 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-red-600 transition-colors text-lg font-bold flex-shrink-0">−</button>
                  <div class="flex-1 text-center">
                    <span class="font-bold text-slate-900 dark:text-white text-base">{{ passengers }}</span>
                    <span class="text-xs text-slate-400 dark:text-slate-500 ml-1">{{ passengers === 1 ? 'Passenger' : 'Passengers' }}</span>
                  </div>
                  <button type="button" (click)="incPassengers()"
                    class="w-11 h-11 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600 hover:text-red-600 transition-colors text-lg font-bold flex-shrink-0">+</button>
                </div>
              </div>

              <div class="flex flex-col justify-end">
                <button type="submit" class="w-full py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 text-base">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  Search Buses
                </button>
              </div>
            </div>

            @if (sameCityError()) {
              <div class="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                </svg>
                <p class="text-red-700 text-sm">From and To cities cannot be the same</p>
              </div>
            }
          </form>
        </div>
      </div>
    </section>

    <!-- ── Trust strip ── -->
    <section class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-4">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="flex flex-wrap justify-center gap-6 sm:gap-10 text-sm font-medium text-slate-600 dark:text-slate-300">
          @for (t of trustItems; track t) {
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              {{ t }}
            </span>
          }
        </div>
      </div>
    </section>

    <!-- ── Why choose us ── -->
    <section class="bg-slate-50 dark:bg-slate-900 max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <div class="text-center mb-12">
        <span class="text-xs font-bold text-red-600 uppercase tracking-widest">Why choose us</span>
        <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">Everything You Need<br/>to Travel Confidently</h2>
        <p class="text-slate-500 dark:text-slate-400 mt-3 max-w-xl mx-auto">From booking to boarding, we've got every step of your journey covered.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (f of features; track f.title) {
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-red-100 hover:-translate-y-1 transition-all duration-200 group">
            <div class="w-14 h-14 rounded-2xl mb-5 flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform" [class]="f.bg">{{ f.icon }}</div>
            <h3 class="font-bold text-slate-900 dark:text-white mb-2">{{ f.title }}</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{{ f.desc }}</p>
          </div>
        }
      </div>
    </section>

    <!-- ── How it works ── -->
    <section class="bg-gradient-to-br from-gray-900 to-gray-800 py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="text-center mb-12">
          <span class="text-xs font-bold text-red-400 uppercase tracking-widest">Simple process</span>
          <h2 class="text-3xl font-extrabold text-white mt-2">Three Steps to<br/>Your Next Journey</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-8">
          @for (step of steps; track step.num) {
            <div class="text-center">
              <div class="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
                <span class="text-3xl font-extrabold text-red-400">{{ step.num }}</span>
              </div>
              <h3 class="font-bold text-white text-lg mb-2">{{ step.title }}</h3>
              <p class="text-gray-400 text-sm leading-relaxed">{{ step.desc }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ── CTA ── -->
    <section class="bg-white dark:bg-slate-800 py-16">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white">Ready to Hit the Road?</h2>
        <p class="text-slate-500 dark:text-slate-400 mt-3 text-lg">Join over 2 million travelers who book smarter with BusGo.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <a routerLink="/auth/register" class="px-8 py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 text-base">
            Create Free Account
          </a>
          <a routerLink="/auth/login" class="px-8 py-3.5 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:border-red-300 hover:text-red-600 transition-all text-base">
            I have an account
          </a>
        </div>
      </div>
    </section>

    <!-- ── Footer ── -->
    <footer class="bg-gray-900 text-gray-400 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-10">
          <div>
            <div class="flex items-center gap-2.5 mb-4">
              <div class="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-md">
                <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"/>
                </svg>
              </div>
              <span class="text-white font-extrabold text-lg">BusGo</span>
            </div>
            <p class="text-sm leading-relaxed">India's most trusted bus booking platform.</p>
          </div>
          <div>
            <h4 class="text-white font-semibold mb-4 text-sm">Quick Links</h4>
            <ul class="space-y-2 text-sm">
              <li><a routerLink="/home" class="hover:text-white transition-colors">Home</a></li>
              <li><a routerLink="/my-bookings" class="hover:text-white transition-colors">My Bookings</a></li>
            </ul>
          </div>
          <div>
            <h4 class="text-white font-semibold mb-4 text-sm">Support</h4>
            <ul class="space-y-2 text-sm">
              <li><span class="hover:text-white transition-colors cursor-pointer">Help Center</span></li>
              <li><span class="hover:text-white transition-colors cursor-pointer">Cancellation Policy</span></li>
              <li><span class="hover:text-white transition-colors cursor-pointer">Refund Policy</span></li>
            </ul>
          </div>
          <div>
            <h4 class="text-white font-semibold mb-4 text-sm">Legal</h4>
            <ul class="space-y-2 text-sm">
              <li><span class="hover:text-white transition-colors cursor-pointer">Terms & Conditions</span></li>
              <li><span class="hover:text-white transition-colors cursor-pointer">Privacy Policy</span></li>
            </ul>
          </div>
        </div>
        <div class="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p class="text-sm">© 2026 BusGo Technologies Pvt. Ltd. All rights reserved.</p>
          <p class="text-sm text-gray-600">Made with care for Indian travelers</p>
        </div>
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
  sameCityError = signal(false);
  today = new Date().toISOString().split('T')[0];
  passengers = 1;

  form = this.fb.group({
    fromCity: ['', Validators.required],
    toCity: ['', Validators.required],
    date: [this.today, Validators.required],
  });

  trustItems = ['Instant Confirmation', 'Secure Payments', 'Choose Your Seat', 'E-Ticket / M-Ticket', '24/7 Support'];

  features = [
    { icon: '⚡', bg: 'bg-yellow-50', title: 'Easy Booking', desc: 'Reserve your seat in under 60 seconds. Our streamlined booking flow is designed for speed and simplicity.' },
    { icon: '🔒', bg: 'bg-green-50', title: 'Secure Payments', desc: 'Bank-grade encryption protects every transaction. Pay via UPI, cards, or net banking with total peace of mind.' },
    { icon: '📍', bg: 'bg-blue-50', title: 'Live Bus Tracking', desc: 'Track your bus in real-time on a live map. Never miss a pickup point or wonder where your bus is again.' },
    { icon: '💺', bg: 'bg-purple-50', title: 'Comfortable Travel', desc: 'Choose from AC sleepers, semi-sleepers, and luxury coaches. Filter by amenities that matter most to you.' },
  ];

  stats = [
    { value: '2M+', label: 'Happy Passengers' },
    { value: '500+', label: 'Routes' },
    { value: '98%', label: 'On-time Rate' },
  ];

  steps = [
    { num: '01', title: 'Search Your Route', desc: 'Enter your origin, destination, and travel date. We\'ll instantly surface every available bus with real-time pricing and seat availability.' },
    { num: '02', title: 'Pick & Customize', desc: 'Filter by timing, operator, bus type, or price range. Choose your preferred seat on an interactive seat map.' },
    { num: '03', title: 'Pay & Board', desc: 'Complete payment securely in seconds and receive your e-ticket instantly. Show it on your phone at boarding — no printout needed.' },
  ];

  ngOnInit() {
    this.stopService.getCities().subscribe({
      next: d => this.cities.set(d),
      error: () => {},
    });
  }

  isInvalid(f: string) { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }

  swapCities() {
    const from = this.form.get('fromCity')?.value;
    const to   = this.form.get('toCity')?.value;
    this.form.patchValue({ fromCity: to, toCity: from });
    this.sameCityError.set(false);
  }

  decPassengers() { if (this.passengers > 1) this.passengers--; }
  incPassengers() { if (this.passengers < 10) this.passengers++; }

  onSearch() {
    this.sameCityError.set(false);
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { fromCity, toCity, date } = this.form.value;
    if (fromCity === toCity) { this.sameCityError.set(true); return; }
    this.router.navigate(['/search'], { queryParams: { from: fromCity, to: toCity, date } });
  }
}