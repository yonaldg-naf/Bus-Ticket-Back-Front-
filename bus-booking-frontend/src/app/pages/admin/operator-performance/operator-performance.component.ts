import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AnalyticsService, OperatorPerformance } from '../../../services/analytics.service';

@Component({
  selector: 'app-operator-performance',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <!-- Header -->
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <a routerLink="/admin" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors text-slate-500 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 class="text-base font-bold text-slate-900 dark:text-white">Operator Performance</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">Platform-wide operator metrics</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <input [(ngModel)]="search" placeholder="Search operator…"
            class="text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 w-48"/>
        </div>
      </div>
    </div>

    @if (loading()) {
      <div class="flex items-center justify-center py-24 gap-3 text-slate-400">
        <svg class="animate-spin w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        Loading performance data…
      </div>
    }

    @if (!loading()) {
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        <!-- Platform Summary -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div class="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl mb-3">🏢</div>
            <p class="text-2xl font-extrabold text-slate-900 dark:text-white">{{ operators().length }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Operators</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div class="w-11 h-11 rounded-xl bg-yellow-50 flex items-center justify-center text-xl mb-3">💰</div>
            <p class="text-2xl font-extrabold text-slate-900 dark:text-white">₹{{ platformRevenue() | number:'1.0-0' }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Platform Revenue</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div class="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center text-xl mb-3">🎫</div>
            <p class="text-2xl font-extrabold text-slate-900 dark:text-white">{{ platformBookings() }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Bookings</p>
          </div>
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div class="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-xl mb-3">⭐</div>
            <p class="text-2xl font-extrabold text-slate-900 dark:text-white">{{ platformAvgRating() | number:'1.1-1' }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg Platform Rating</p>
          </div>
        </div>

        <!-- Operators Table -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 class="font-bold text-slate-900 dark:text-white">Operator Leaderboard</h2>
            <span class="text-xs text-slate-400 dark:text-slate-500">{{ filtered().length }} operators</span>
          </div>

          @if (filtered().length === 0) {
            <div class="text-center py-16 text-slate-400 dark:text-slate-500">
              <p class="text-4xl mb-3">🔍</p>
              <p class="text-sm dark:text-slate-400">No operators found</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                    <th class="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">#</th>
                    <th class="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Operator</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Buses</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Bookings</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Revenue</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Rating</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Cancel Rate</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Score</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50 dark:divide-slate-700">
                  @for (op of filtered(); track op.operatorId; let i = $index) {
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td class="px-6 py-4">
                        <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          [class]="i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'">
                          {{ i + 1 }}
                        </span>
                      </td>
                      <td class="px-6 py-4">
                        <p class="font-semibold text-slate-800 dark:text-white">{{ op.companyName }}</p>
                        <p class="text-xs text-slate-400 dark:text-slate-500">{{ op.ownerName }}</p>
                      </td>
                      <td class="px-4 py-4 text-right font-medium text-slate-700">{{ op.totalBuses }}</td>
                      <td class="px-4 py-4 text-right">
                        <p class="font-medium text-slate-700 dark:text-slate-300">{{ op.totalBookings }}</p>
                        <p class="text-xs text-green-600">{{ op.confirmedBookings }} confirmed</p>
                      </td>
                      <td class="px-4 py-4 text-right font-bold text-slate-900">₹{{ op.totalRevenue | number:'1.0-0' }}</td>
                      <td class="px-4 py-4 text-right">
                        <div class="flex items-center justify-end gap-1">
                          <span class="text-amber-500 text-xs">★</span>
                          <span class="font-semibold text-slate-800 dark:text-white">{{ op.averageRating | number:'1.1-1' }}</span>
                          <span class="text-xs text-slate-400 dark:text-slate-500">({{ op.totalReviews }})</span>
                        </div>
                      </td>
                      <td class="px-4 py-4 text-right">
                        <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                          [class]="op.cancellationRate > 20 ? 'bg-red-100 text-red-700' : op.cancellationRate > 10 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'">
                          {{ op.cancellationRate | number:'1.0-1' }}%
                        </span>
                      </td>
                      <td class="px-4 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <div class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full bg-red-500 rounded-full" [style.width.%]="performanceScore(op)"></div>
                          </div>
                          <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ performanceScore(op) | number:'1.0-0' }}</span>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    }
  </div>
  `,
})
export class OperatorPerformanceComponent implements OnInit {
  private analyticsSvc = inject(AnalyticsService);

  loading   = signal(true);
  operators = signal<OperatorPerformance[]>([]);
  search    = '';

  ngOnInit() {
    this.analyticsSvc.getAllOperatorPerformance().subscribe({
      next:  d  => { this.operators.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  filtered = computed(() => {
    const q = this.search.toLowerCase();
    return this.operators().filter(o =>
      !q || o.companyName.toLowerCase().includes(q) || o.ownerName.toLowerCase().includes(q)
    );
  });

  platformRevenue  = computed(() => this.operators().reduce((s, o) => s + o.totalRevenue, 0));
  platformBookings = computed(() => this.operators().reduce((s, o) => s + o.totalBookings, 0));
  platformAvgRating = computed(() => {
    const ops = this.operators().filter(o => o.totalReviews > 0);
    if (!ops.length) return 0;
    return ops.reduce((s, o) => s + o.averageRating, 0) / ops.length;
  });

  performanceScore(op: OperatorPerformance): number {
    // Score 0-100 based on rating (40%), low cancellation (30%), bookings volume (30%)
    const ratingScore = (op.averageRating / 5) * 40;
    const cancelScore = Math.max(0, (1 - op.cancellationRate / 100)) * 30;
    const maxBookings = Math.max(...this.operators().map(o => o.totalBookings), 1);
    const bookingScore = (op.totalBookings / maxBookings) * 30;
    return Math.min(100, ratingScore + cancelScore + bookingScore);
  }
}
