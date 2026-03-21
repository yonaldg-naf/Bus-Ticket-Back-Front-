import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScheduleService, ScheduleResponse } from '../../../services/schedule.service';
import { BookingStateService } from '../../../services/booking-state.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-gray-50">

    <!-- Sticky search bar -->
    <div class="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-2 text-sm">
          <span class="font-bold text-gray-900 text-base">{{ fromCity() }}</span>
          <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
          </svg>
          <span class="font-bold text-gray-900 text-base">{{ toCity() }}</span>
          <span class="text-gray-400 mx-1">·</span>
          <span class="text-gray-600">{{ dateDisplay() }}</span>
          @if (!loading()) {
            <span class="ml-2 badge badge-info">{{ items().length }} bus{{ items().length !== 1 ? 'es' : '' }}</span>
          }
        </div>
        <div class="flex items-center gap-2">
          <select [(ngModel)]="sortBy" (ngModelChange)="reload()"
            class="text-sm px-3 py-1.5 border border-gray-300 rounded-lg bg-white
                   focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500">
            <option value="departure">Sort: Departure</option>
            <option value="price">Sort: Price ↑</option>
            <option value="busCode">Sort: Bus Code</option>
          </select>
          <a routerLink="/home" class="btn-ghost text-xs">← Change</a>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">

      <!-- Loading skeletons -->
      @if (loading()) {
        <div class="space-y-4">
          @for (_ of [1,2,3]; track $index) {
            <div class="card p-5 animate-pulse">
              <div class="flex items-start justify-between">
                <div class="space-y-2 flex-1">
                  <div class="h-5 skeleton w-32 rounded"></div>
                  <div class="h-4 skeleton w-48 rounded"></div>
                  <div class="h-4 skeleton w-40 rounded"></div>
                </div>
                <div class="h-10 skeleton w-28 rounded-xl"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && items().length === 0) {
        <div class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center text-4xl mb-4">🔍</div>
          <h3 class="text-xl font-bold text-gray-800">No buses found</h3>
          <p class="text-gray-500 mt-2 max-w-xs">
            No buses available for this route on {{ dateDisplay() }}. Try another date.
          </p>
          <a routerLink="/home" class="btn-primary mt-6">← Change Search</a>
        </div>
      }

      <!-- Results -->
      <div class="space-y-4">
        @for (s of items(); track s.id) {
          <div class="card hover:shadow-md hover:border-red-200 transition-all group">
            <div class="p-5">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                <!-- Left: bus info -->
                <div class="flex items-start gap-4 flex-1 min-w-0">
                  <div class="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-2xl flex-shrink-0">
                    🚌
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h3 class="font-bold text-gray-900 text-base">{{ s.busCode }}</h3>
                      <span class="text-gray-400 text-sm font-mono">{{ s.registrationNumber }}</span>
                    </div>
                    <div class="flex items-center gap-4 mt-1.5 text-sm text-gray-600 flex-wrap">
                      <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                        </svg>
                        {{ s.routeCode }}
                      </span>
                      <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        {{ formatDeparture(s.departureUtc) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Right: price + book -->
                <div class="flex items-center gap-4 flex-shrink-0">
                  <div class="text-right">
                    <p class="text-2xl font-extrabold text-gray-900">₹{{ s.basePrice | number:'1.0-0' }}</p>
                    <p class="text-xs text-gray-400">per seat</p>
                  </div>
                  <button (click)="selectBus(s)" class="btn-primary px-6 py-3 text-base group-hover:shadow-md">
                    Book Now
                  </button>
                </div>
              </div>

              <!-- Tags row -->
              <div class="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap text-xs text-gray-500">
                @for (tag of featureTags; track tag) {
                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    {{ tag }}
                  </span>
                  @if (!$last) { <span class="text-gray-200">·</span> }
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  </div>
  `,
})
export class SearchResultsComponent implements OnInit {
  private route         = inject(ActivatedRoute);
  private router        = inject(Router);
  private scheduleSvc   = inject(ScheduleService);
  private bookingState  = inject(BookingStateService);
  private toast         = inject(ToastService);

  loading    = signal(true);
  allItems   = signal<ScheduleResponse[]>([]);
  sortBy     = 'departure';
  sortDir    = 'asc';

  fromCity   = signal('');
  toCity     = signal('');
  travelDate = signal('');

  featureTags = ['Instant Confirmation', 'Seat Selection', 'E-Ticket'];

  items = computed(() => {
    const list = [...this.allItems()];
    return list.sort((a, b) => {
      if (this.sortBy === 'price')   return a.basePrice - b.basePrice;
      if (this.sortBy === 'busCode') return a.busCode.localeCompare(b.busCode);
      return new Date(a.departureUtc).getTime() - new Date(b.departureUtc).getTime();
    });
  });

  dateDisplay = computed(() => {
    const d = this.travelDate();
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  });

  ngOnInit() {
    this.route.queryParams.subscribe(p => {
      this.fromCity.set(p['from'] ?? '');
      this.toCity.set(p['to'] ?? '');
      this.travelDate.set(p['date'] ?? '');
      this.reload();
    });
  }

  reload() {
    if (!this.fromCity() || !this.toCity() || !this.travelDate()) return;
    this.loading.set(true);
    this.scheduleSvc.searchByKeys({
      fromCity: this.fromCity(),
      toCity:   this.toCity(),
      date:     this.travelDate(),
      sortBy:   this.sortBy,
      sortDir:  this.sortDir,
    }).subscribe({
      next:  (res: any) => { this.allItems.set(res?.items ?? res ?? []); this.loading.set(false); },
      error: ()         => { this.loading.set(false); this.toast.error('Failed to load schedules.'); },
    });
  }

  selectBus(s: ScheduleResponse) {
    // Cast to the model ScheduleResponse type that BookingStateService expects
    this.bookingState.setSchedule(s as any);
    this.router.navigate(['/booking/seats', s.id]);
  }

  formatDeparture(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }
}