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
    <section class="container max-w-5xl pt-10">
      <!-- Heading + filters row -->
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight">Search Results</h1>
          <p class="text-muted">From <span class="font-semibold">{{ fromCity() }}</span> to <span class="font-semibold">{{ toCity() }}</span> · {{ dateDisplay() }}</p>
        </div>
        <div class="flex gap-2">
          <select class="input w-44" [(ngModel)]="sortBy" (ngModelChange)="reload()">
            <option value="departure">Sort by: Departure</option>
            <option value="price">Sort by: Price</option>
            <option value="busCode">Sort by: Bus</option>
            <option value="routeCode">Sort by: Route</option>
          </select>
          <select class="input w-28" [(ngModel)]="sortDir" (ngModelChange)="reload()">
            <option value="asc">ASC</option>
            <option value="desc">DESC</option>
          </select>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1,2,3,4]; track $index) {
            <div class="card">
              <div class="card-body">
                <div class="h-4 bg-[#efefef] rounded w-40 mb-3"></div>
                <div class="h-3 bg-[#f4f4f4] rounded w-64"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty -->
      @if (!loading() && items().length === 0) {
        <div class="text-center py-16">
          <div class="text-4xl mb-3">🗺️</div>
          <h3 class="font-semibold text-lg">No buses found</h3>
          <p class="text-muted mt-1">Try changing date or city.</p>
          <a routerLink="/home" class="btn btn-secondary mt-4">Back to Home</a>
        </div>
      }

      <!-- Results -->
      <div class="space-y-3">
        @for (s of items(); track s.id) {
          <div class="card hover:card-soft transition-shadow">
            <div class="card-body">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <!-- Left: bus & route -->
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-lg">{{ s.busCode }}</span>
                    <span class="badge badge-neutral">{{ s.registrationNumber }}</span>
                    <span class="text-muted">·</span>
                    <span class="text-sm text-[var(--graphite)]">{{ s.routeCode }}</span>
                  </div>
                  <p class="text-sm text-muted mt-1 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {{ formatDateTime(s.departureUtc) }}
                  </p>
                </div>

                <!-- Right: price & CTA -->
                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <div class="text-xs text-muted">Starts from</div>
                    <div class="text-xl font-bold">₹{{ s.basePrice }}</div>
                  </div>
                  <button class="btn btn-primary" (click)="goToSeats(s)">View seats</button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Pager (if you want to add later) -->
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

  dateDisplay = computed(() => new Date(this.date()).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  }));

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
      date: this.date(), // yyyy-MM-dd
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
      }
    });
  }

  goToSeats(s: ScheduleResponse): void {
    // persist for next screens
    this.bookingState.setSchedule(s as any);
    this.router.navigate(['/booking/seats', s.id]);
  }

  formatDateTime(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }
}
