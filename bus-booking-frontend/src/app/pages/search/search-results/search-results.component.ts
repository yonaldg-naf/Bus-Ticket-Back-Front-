import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../../../services/schedule.service';
import { BookingStateService } from '../../../services/booking-state.service';
import { ToastService } from '../../../services/toast.service';

interface ScheduleResponse {
  id: string;
  busId: string;
  routeId: string;
  busCode: string;
  registrationNumber: string;
  routeCode: string;
  departureUtc: string;
  basePrice: number;
  createdAtUtc: string;
  updatedAtUtc?: string;
}

interface PagedResult<T> {
  page: number;
  pageSize: number;
  totalCount: number;
  items: T[];
}

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <section class="min-h-[calc(100vh-64px)] bg-[#0f0f10] px-4 py-10">

    <div class="max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">

        <div>
          <h1 class="text-2xl font-bold text-white">Available Buses</h1>
          <p class="text-gray-400 text-sm mt-1">
            {{ fromCity() }} → {{ toCity() }} · {{ dateDisplay() }}
          </p>
        </div>

        <div class="flex gap-2">
          <select [(ngModel)]="sortBy" (ngModelChange)="reload()"
            class="px-3 py-2 rounded-lg bg-[#161618] border border-[#2a2a2d] text-gray-300 text-sm">
            <option value="departure">Departure</option>
            <option value="price">Price</option>
            <option value="busCode">Bus</option>
            <option value="routeCode">Route</option>
          </select>

          <select [(ngModel)]="sortDir" (ngModelChange)="reload()"
            class="px-3 py-2 rounded-lg bg-[#161618] border border-[#2a2a2d] text-gray-300 text-sm">
            <option value="asc">ASC</option>
            <option value="desc">DESC</option>
          </select>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="space-y-4">
          @for (_ of [1,2,3,4]; track $index) {
            <div class="bg-[#161618] border border-[#2a2a2d] rounded-xl p-5 animate-pulse">
              <div class="h-4 bg-[#2a2a2d] rounded w-40 mb-3"></div>
              <div class="h-3 bg-[#1f1f22] rounded w-60"></div>
            </div>
          }
        </div>
      }

      <!-- Empty -->
      @if (!loading() && items().length === 0) {
        <div class="text-center py-20">
          <div class="text-5xl mb-3">🗺️</div>
          <h3 class="text-white text-lg font-semibold">No buses found</h3>
          <p class="text-gray-500 mt-1">Try different date or route</p>

          <a routerLink="/home"
             class="inline-block mt-5 px-5 py-2 rounded-lg
                    bg-gradient-to-r from-[#D32F2F] to-[#7f1d1d]
                    text-white text-sm font-medium">
            Back to Home
          </a>
        </div>
      }

      <!-- Results -->
      <div class="space-y-4">

        @for (s of items(); track s.id) {

          <div class="bg-[#161618] border border-[#2a2a2d] rounded-xl p-5
                      hover:border-[#D32F2F]/40 transition">

            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

              <!-- Left -->
              <div>
                <div class="flex items-center gap-2 flex-wrap">

                  <span class="text-white font-semibold text-lg">
                    {{ s.busCode }}
                  </span>

                  <span class="text-xs px-2 py-1 rounded bg-[#0f0f10] border border-[#2a2a2d] text-gray-400">
                    {{ s.registrationNumber }}
                  </span>

                  <span class="text-gray-500">•</span>

                  <span class="text-sm text-gray-400">
                    {{ s.routeCode }}
                  </span>

                </div>

                <p class="text-sm text-gray-400 mt-2 flex items-center gap-1.5">
                  🕒 {{ formatDateTime(s.departureUtc) }}
                </p>
              </div>

              <!-- Right -->
              <div class="flex items-center gap-6">

                <div class="text-right">
                  <div class="text-xs text-gray-500">Starts from</div>
                  <div class="text-xl font-bold text-white">
                    ₹{{ s.basePrice }}
                  </div>
                </div>

                <button
                  (click)="goToSeats(s)"
                  class="px-5 py-2 rounded-lg text-white text-sm font-medium
                         bg-gradient-to-r from-[#D32F2F] to-[#7f1d1d]
                         hover:opacity-90 active:scale-95 transition">
                  View Seats
                </button>

              </div>

            </div>

          </div>

        }

      </div>

    </div>
  </section>
  `,
})
export class SearchResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scheduleService = inject(ScheduleService);
  private bookingState = inject(BookingStateService);
  private toast = inject(ToastService);

  loading = signal(true);
  items = signal<ScheduleResponse[]>([]);
  totalCount = signal(0);

  fromCity = signal('');
  toCity = signal('');
  date = signal('');

  sortBy = 'departure';
  sortDir = 'asc';

  dateDisplay = computed(() =>
    new Date(this.date()).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  );

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((qp) => {
      this.fromCity.set(qp.get('from') ?? '');
      this.toCity.set(qp.get('to') ?? '');
      this.date.set(qp.get('date') ?? '');
      this.reload();
    });
  }

  reload(): void {
    if (!this.fromCity() || !this.toCity() || !this.date()) return;

    this.loading.set(true);

    const body = {
      fromCity: this.fromCity(),
      toCity: this.toCity(),
      date: this.date(),
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      page: 1,
      pageSize: 50,
    };

    this.scheduleService.searchByKeys(body as any).subscribe({
      next: (res: PagedResult<ScheduleResponse>) => {
        this.items.set(res.items ?? []);
        this.totalCount.set(res.totalCount ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load search results.');
      },
    });
  }

  goToSeats(s: ScheduleResponse): void {
    this.bookingState.setSchedule(s as any);
    this.router.navigate(['/booking/seats', s.id]);
  }

  formatDateTime(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}