import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AnalyticsService, OperatorAnalytics, DailyRevenue } from '../../../services/analytics.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <!-- Header -->
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <a routerLink="/operator" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors text-slate-500 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 class="text-base font-bold text-slate-900 dark:text-white">Revenue Analytics</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">Track your earnings and performance</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs text-slate-500 font-medium">Period:</label>
          <select [(ngModel)]="selectedDays" (ngModelChange)="load()" class="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500">
            <option [value]="7">Last 7 days</option>
            <option [value]="30">Last 30 days</option>
            <option [value]="90">Last 90 days</option>
          </select>
        </div>
      </div>
    </div>

    @if (loading()) {
      <div class="flex items-center justify-center py-24 gap-3 text-slate-400">
        <svg class="animate-spin w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Loading analytics…
      </div>
    }

    @if (!loading() && data()) {
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        <!-- KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div class="w-11 h-11 rounded-xl bg-yellow-50 flex items-center justify-center text-xl mb-3">💰</div>
            <p class="text-2xl font-extrabold text-slate-900 dark:text-white">₹{{ data()!.totalRevenue | number:'1.0-0' }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Revenue</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div class="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-xl mb-3">🎫</div>
            <p class="text-2xl font-extrabold text-slate-900 dark:text-white">{{ data()!.totalBookings }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Bookings</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div class="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl mb-3">📊</div>
            <p class="text-2xl font-extrabold text-slate-900 dark:text-white">{{ data()!.averageOccupancyRate | number:'1.0-1' }}%</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg Occupancy</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div class="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-xl mb-3">⭐</div>
            <p class="text-2xl font-extrabold text-slate-900 dark:text-white">{{ data()!.averageRating | number:'1.1-1' }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg Rating ({{ data()!.totalReviews }} reviews)</p>
          </div>
        </div>

        <!-- Revenue Chart -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 class="font-bold text-slate-900 dark:text-white">Daily Revenue</h2>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Revenue trend over selected period</p>
            </div>
            <div class="flex items-center gap-4 text-xs text-slate-500">
              <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-red-500 inline-block"></span>Revenue</span>
              <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-blue-400 inline-block"></span>Bookings</span>
            </div>
          </div>
          <div class="p-6">
            @if (data()!.dailyRevenue.length === 0) {
              <div class="text-center py-12 text-slate-400">
                <p class="text-4xl mb-2">📈</p>
                <p class="text-sm dark:text-slate-400">No revenue data for this period</p>
              </div>
            } @else {
              <!-- Bar chart -->
              <div class="flex items-end gap-1 h-48 overflow-x-auto pb-2">
                @for (day of data()!.dailyRevenue; track day.date) {
                  <div class="flex flex-col items-center gap-1 flex-1 min-w-[28px] group relative">
                    <!-- Tooltip -->
                    <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded-lg px-2 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                      <p class="font-semibold">{{ formatChartDate(day.date) }}</p>
                      <p>₹{{ day.revenue | number:'1.0-0' }}</p>
                      <p>{{ day.bookings }} bookings</p>
                    </div>
                    <div class="w-full rounded-t-md bg-red-500 hover:bg-red-600 transition-colors cursor-pointer"
                      [style.height.%]="barHeight(day.revenue)"></div>
                  </div>
                }
              </div>
              <!-- X-axis labels -->
              <div class="flex gap-1 mt-1 overflow-x-auto">
                @for (day of data()!.dailyRevenue; track day.date) {
                  <div class="flex-1 min-w-[28px] text-center text-xs text-slate-400 truncate">
                    {{ formatAxisDate(day.date) }}
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Top Routes + Booking Breakdown -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- Top Routes -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 class="font-bold text-slate-900 dark:text-white">Top Routes</h2>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Best performing routes by revenue</p>
            </div>
            <div class="divide-y divide-slate-50 dark:divide-slate-700">
              @if (data()!.topRoutes.length === 0) {
                <div class="text-center py-10 text-slate-400 text-sm">No route data available</div>
              }
              @for (route of data()!.topRoutes; track route.routeCode; let i = $index) {
                <div class="px-6 py-4 flex items-center gap-4">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-600'">
                    {{ i + 1 }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-slate-800 dark:text-white text-sm font-mono">{{ route.routeCode }}</p>
                    <div class="flex items-center gap-3 mt-1">
                      <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full bg-red-500 rounded-full" [style.width.%]="routeBarWidth(route.totalRevenue)"></div>
                      </div>
                      <span class="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{{ route.occupancyRate | number:'1.0-0' }}% occ.</span>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="font-bold text-slate-900 dark:text-white text-sm">₹{{ route.totalRevenue | number:'1.0-0' }}</p>
                    <p class="text-xs text-slate-400 dark:text-slate-500">{{ route.totalBookings }} bookings</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Booking Breakdown -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 class="font-bold text-slate-900 dark:text-white">Booking Breakdown</h2>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Status distribution</p>
            </div>
            <div class="p-6 space-y-4">
              @for (item of bookingBreakdown(); track item.label) {
                <div>
                  <div class="flex justify-between text-sm mb-1.5">
                    <span class="font-medium text-slate-700 dark:text-slate-300">{{ item.label }}</span>
                    <span class="font-bold text-slate-900 dark:text-white">{{ item.count }} <span class="text-slate-400 font-normal text-xs">({{ item.pct | number:'1.0-1' }}%)</span></span>
                  </div>
                  <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all" [class]="item.color" [style.width.%]="item.pct"></div>
                  </div>
                </div>
              }
            </div>
          </div>

        </div>
      </div>
    }
  </div>
  `,
})
export class AnalyticsComponent implements OnInit {
  private analyticsSvc = inject(AnalyticsService);

  loading     = signal(true);
  data        = signal<OperatorAnalytics | null>(null);
  selectedDays = 30;

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.analyticsSvc.getOperatorAnalytics(this.selectedDays).subscribe({
      next:  d  => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  maxRevenue = computed(() => {
    const d = this.data();
    if (!d || d.dailyRevenue.length === 0) return 1;
    return Math.max(...d.dailyRevenue.map(x => x.revenue), 1);
  });

  barHeight(rev: number): number {
    return Math.max((rev / this.maxRevenue()) * 100, 2);
  }

  maxRouteRevenue = computed(() => {
    const d = this.data();
    if (!d || d.topRoutes.length === 0) return 1;
    return Math.max(...d.topRoutes.map(x => x.totalRevenue), 1);
  });

  routeBarWidth(rev: number): number {
    return (rev / this.maxRouteRevenue()) * 100;
  }

  bookingBreakdown = computed(() => {
    const d = this.data();
    if (!d) return [];
    const total = d.totalBookings || 1;
    return [
      { label: 'Confirmed',  count: d.confirmedBookings,  pct: (d.confirmedBookings / total) * 100,  color: 'bg-green-500' },
      { label: 'Cancelled',  count: d.cancelledBookings,  pct: (d.cancelledBookings / total) * 100,  color: 'bg-red-400'   },
      { label: 'Pending',    count: d.totalBookings - d.confirmedBookings - d.cancelledBookings,
        pct: ((d.totalBookings - d.confirmedBookings - d.cancelledBookings) / total) * 100, color: 'bg-amber-400' },
    ];
  });

  formatChartDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  formatAxisDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}
