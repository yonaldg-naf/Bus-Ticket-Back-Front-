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

    <!-- ── Sticky search bar ── -->
    <div class="bg-white border-b border-gray-100 shadow-sm sticky top-16 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3 text-sm">
          <div class="flex items-center gap-2 font-bold text-gray-900 text-base">
            <span>{{ fromCity() }}</span>
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
            <span>{{ toCity() }}</span>
          </div>
          <span class="text-gray-300">·</span>
          <span class="text-gray-500 text-sm">{{ dateDisplay() }}</span>
          @if (!loading()) {
            <span class="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
              {{ filteredItems().length }} bus{{ filteredItems().length !== 1 ? 'es' : '' }}
            </span>
          }
        </div>
        <div class="flex items-center gap-2">
          <button (click)="filtersOpen.update(v => !v)"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors"
            [class]="filtersOpen() ? 'border-red-400 text-red-600 bg-red-50' : 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
            </svg>
            Filters
            @if (activeFilterCount() > 0) {
              <span class="w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center font-bold">{{ activeFilterCount() }}</span>
            }
          </button>
          <select [(ngModel)]="sortBy" (ngModelChange)="applySort()"
            class="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 font-medium text-gray-700">
            <option value="departure-asc">Departure ↑ (Earliest)</option>
            <option value="departure-desc">Departure ↓ (Latest)</option>
            <option value="price-asc">Price ↑ (Cheapest)</option>
            <option value="price-desc">Price ↓ (Expensive)</option>
            <option value="seats-desc">Most Seats</option>
            <option value="busCode-asc">Bus Code A–Z</option>
          </select>
          <a routerLink="/home"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-600 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Edit Search
          </a>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div class="flex gap-6">

        <!-- ── Filter Sidebar ── -->
        @if (filtersOpen()) {
          <aside class="w-72 flex-shrink-0">
            <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-32">
              <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 class="font-bold text-gray-900">Filters</h3>
                @if (activeFilterCount() > 0) {
                  <button (click)="clearFilters()" class="text-xs text-red-600 font-semibold hover:underline">Clear all</button>
                }
              </div>

              <div class="p-5 space-y-6">

                <!-- Bus Type -->
                <div>
                  <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Bus Type</h4>
                  <div class="space-y-2">
                    @for (bt of busTypeOptions; track bt.value) {
                      <label class="flex items-center gap-2.5 cursor-pointer group">
                        <input type="checkbox" [checked]="filterBusTypes.includes(bt.value)"
                          (change)="toggleBusType(bt.value)"
                          class="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"/>
                        <span class="text-sm text-gray-700 group-hover:text-gray-900">{{ bt.label }}</span>
                        <span class="ml-auto text-xs text-gray-400">{{ busTypeCount(bt.value) }}</span>
                      </label>
                    }
                  </div>
                </div>

                <!-- Departure Time -->
                <div>
                  <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Departure Time</h4>
                  <div class="grid grid-cols-2 gap-2">
                    @for (slot of timeSlots; track slot.key) {
                      <button (click)="toggleTimeSlot(slot.key)"
                        class="flex flex-col items-center p-2.5 rounded-xl border-2 text-xs font-medium transition-all"
                        [class]="filterTimeSlots.includes(slot.key) ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'">
                        <span class="text-lg mb-0.5">{{ slot.icon }}</span>
                        <span>{{ slot.label }}</span>
                        <span class="text-gray-400 font-normal">{{ slot.time }}</span>
                      </button>
                    }
                  </div>
                </div>

                <!-- Price Range -->
                <div>
                  <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Price Range</h4>
                  <div class="space-y-3">
                    <div class="flex items-center justify-between text-sm">
                      <span class="font-semibold text-gray-900">₹{{ priceMin }}</span>
                      <span class="text-gray-400">to</span>
                      <span class="font-semibold text-gray-900">₹{{ priceMax }}</span>
                    </div>
                    <input type="range" [(ngModel)]="priceMin" [min]="absoluteMinPrice()" [max]="priceMax - 1" step="50"
                      class="w-full accent-red-600 cursor-pointer"/>
                    <input type="range" [(ngModel)]="priceMax" [min]="priceMin + 1" [max]="absoluteMaxPrice()" step="50"
                      class="w-full accent-red-600 cursor-pointer"/>
                    <div class="flex justify-between text-xs text-gray-400">
                      <span>₹{{ absoluteMinPrice() }}</span>
                      <span>₹{{ absoluteMaxPrice() }}</span>
                    </div>
                  </div>
                </div>

                <!-- Seats Available -->
                <div>
                  <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Min. Seats Available</h4>
                  <div class="flex gap-2 flex-wrap">
                    @for (n of [1,2,3,4,5,6]; track n) {
                      <button (click)="filterMinSeats = filterMinSeats === n ? 0 : n"
                        class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
                        [class]="filterMinSeats === n ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'">
                        {{ n }}+
                      </button>
                    }
                  </div>
                </div>

              </div>
            </div>
          </aside>
        }

        <!-- ── Results ── -->
        <div class="flex-1 min-w-0">

          <!-- Loading skeletons -->
          @if (loading()) {
            <div class="space-y-4">
              @for (_ of [1,2,3]; track $index) {
                <div class="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex items-start gap-4 flex-1">
                      <div class="w-14 h-14 skeleton rounded-2xl"></div>
                      <div class="space-y-2 flex-1">
                        <div class="h-5 skeleton w-40 rounded"></div>
                        <div class="h-4 skeleton w-56 rounded"></div>
                        <div class="h-4 skeleton w-32 rounded"></div>
                      </div>
                    </div>
                    <div class="space-y-2">
                      <div class="h-8 skeleton w-24 rounded"></div>
                      <div class="h-10 skeleton w-28 rounded-xl"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Empty state — no results from API -->
          @if (!loading() && allItems().length === 0) {
            <div class="flex flex-col items-center justify-center py-24 text-center">
              <div class="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center text-5xl mb-5 shadow-inner">🔍</div>
              <h3 class="text-xl font-bold text-gray-800">No buses found</h3>
              <p class="text-gray-500 mt-2 max-w-xs text-sm">
                No buses available for this route on {{ dateDisplay() }}. Try a different date.
              </p>
              <a routerLink="/home" class="btn-primary mt-6 px-6 py-3">← Change Search</a>
            </div>
          }

          <!-- Empty state — filters too strict -->
          @if (!loading() && allItems().length > 0 && filteredItems().length === 0) {
            <div class="flex flex-col items-center justify-center py-20 text-center">
              <div class="text-5xl mb-4">🎛️</div>
              <h3 class="text-lg font-bold text-gray-800">No buses match your filters</h3>
              <p class="text-gray-500 mt-1.5 text-sm">Try relaxing your filter criteria</p>
              <button (click)="clearFilters()" class="btn-primary mt-5 px-6 py-2.5">Clear Filters</button>
            </div>
          }

          <!-- Results list -->
          <div class="space-y-4">
            @for (s of filteredItems(); track s.id) {
              <div class="bus-card group">
                <div class="p-5 sm:p-6">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

                    <!-- Left: operator + timing -->
                    <div class="flex items-start gap-4 flex-1 min-w-0">
                      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0 shadow-md shadow-red-200">
                        {{ s.busCode.slice(0,2).toUpperCase() }}
                      </div>

                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                          <h3 class="font-extrabold text-gray-900 text-base">{{ s.busCode }}</h3>
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                            [class]="busTypeBadgeClass(s.busType)">
                            {{ busTypeLabel(s.busType) }}
                          </span>
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {{ timeSlotLabel(s.departureUtc) }}
                          </span>
                        </div>
                        <p class="text-sm text-gray-500 font-mono mb-2">{{ s.registrationNumber }}</p>

                        <!-- Timing row -->
                        <div class="flex items-center gap-3 text-sm">
                          <div class="text-center">
                            <p class="font-bold text-gray-900 text-base">{{ formatTime(s.departureUtc) }}</p>
                            <p class="text-xs text-gray-400">{{ formatDate(s.departureUtc) }}</p>
                          </div>
                          <div class="flex-1 flex items-center gap-1 min-w-[60px]">
                            <div class="flex-1 h-px bg-gray-200"></div>
                            <span class="text-xs text-gray-400 whitespace-nowrap px-1">{{ s.routeCode }}</span>
                            <div class="flex-1 h-px bg-gray-200"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Right: seats + price + CTA -->
                    <div class="flex items-center gap-5 flex-shrink-0">
                      <div class="text-right">
                        <div class="flex items-center justify-end gap-1.5 mb-1">
                          <span class="text-xs text-gray-400">{{ s.totalSeats }} seats</span>
                          <span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                          <span class="text-xs text-green-600 font-semibold">Available</span>
                        </div>
                        <p class="text-2xl font-extrabold text-gray-900">₹{{ s.basePrice | number:'1.0-0' }}</p>
                        <p class="text-xs text-gray-400">per seat</p>
                      </div>
                      <button (click)="selectBus(s)"
                        class="px-5 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-200 hover:shadow-red-300 whitespace-nowrap text-sm">
                        Select Seats →
                      </button>
                    </div>
                  </div>

                  <!-- Tags row -->
                  <div class="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 flex-wrap text-xs text-gray-500">
                    @for (tag of featureTags; track tag) {
                      <span class="flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        {{ tag }}
                      </span>
                    }
                    <span class="ml-auto text-xs text-gray-400 font-mono">ID: {{ s.id.slice(0,8) }}…</span>
                  </div>
                </div>
              </div>
            }
          </div>

        </div>
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
  filtersOpen = signal(false);

  fromCity   = signal('');
  toCity     = signal('');
  travelDate = signal('');

  // Sort
  sortBy = 'departure-asc';

  // Filters
  filterBusTypes: number[] = [];
  filterTimeSlots: string[] = [];
  priceMin = 0;
  priceMax = 9999;
  filterMinSeats = 0;

  featureTags = ['Instant Confirmation', 'Seat Selection', 'E-Ticket', 'Free Cancellation'];

  busTypeOptions = [
    { value: 1, label: 'Seater' },
    { value: 2, label: 'Semi Sleeper' },
    { value: 3, label: 'Sleeper' },
    { value: 4, label: 'AC' },
    { value: 5, label: 'Non-AC' },
  ];

  timeSlots = [
    { key: 'morning',   label: 'Morning',   icon: '🌅', time: '6am–12pm'  },
    { key: 'afternoon', label: 'Afternoon', icon: '☀️', time: '12pm–6pm'  },
    { key: 'evening',   label: 'Evening',   icon: '🌆', time: '6pm–10pm'  },
    { key: 'night',     label: 'Night',     icon: '🌙', time: '10pm–6am'  },
  ];

  absoluteMinPrice = computed(() => {
    const items = this.allItems();
    return items.length ? Math.floor(Math.min(...items.map(i => i.basePrice))) : 0;
  });

  absoluteMaxPrice = computed(() => {
    const items = this.allItems();
    return items.length ? Math.ceil(Math.max(...items.map(i => i.basePrice))) : 9999;
  });

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.filterBusTypes.length) count++;
    if (this.filterTimeSlots.length) count++;
    if (this.priceMin > this.absoluteMinPrice() || this.priceMax < this.absoluteMaxPrice()) count++;
    if (this.filterMinSeats > 0) count++;
    return count;
  });

  filteredItems = computed(() => {
    let list = [...this.allItems()];

    // Bus type filter
    if (this.filterBusTypes.length) {
      list = list.filter(s => this.filterBusTypes.includes(s.busType));
    }

    // Time slot filter
    if (this.filterTimeSlots.length) {
      list = list.filter(s => this.filterTimeSlots.includes(this.getTimeSlot(s.departureUtc)));
    }

    // Price filter
    list = list.filter(s => s.basePrice >= this.priceMin && s.basePrice <= this.priceMax);

    // Min seats filter
    if (this.filterMinSeats > 0) {
      list = list.filter(s => s.totalSeats >= this.filterMinSeats);
    }

    // Sort
    const [field, dir] = this.sortBy.split('-');
    list.sort((a, b) => {
      let cmp = 0;
      if (field === 'departure') cmp = new Date(a.departureUtc).getTime() - new Date(b.departureUtc).getTime();
      else if (field === 'price') cmp = a.basePrice - b.basePrice;
      else if (field === 'seats') cmp = a.totalSeats - b.totalSeats;
      else if (field === 'busCode') cmp = a.busCode.localeCompare(b.busCode);
      return dir === 'desc' ? -cmp : cmp;
    });

    return list;
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
    }).subscribe({
      next: (res: any) => {
        const items: ScheduleResponse[] = res?.items ?? res ?? [];
        this.allItems.set(items);
        // Init price range to full range
        if (items.length) {
          this.priceMin = Math.floor(Math.min(...items.map(i => i.basePrice)));
          this.priceMax = Math.ceil(Math.max(...items.map(i => i.basePrice)));
        }
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast.error('Failed to load schedules.'); },
    });
  }

  applySort() { /* filteredItems computed auto-updates */ }

  toggleBusType(val: number) {
    this.filterBusTypes = this.filterBusTypes.includes(val)
      ? this.filterBusTypes.filter(v => v !== val)
      : [...this.filterBusTypes, val];
  }

  toggleTimeSlot(key: string) {
    this.filterTimeSlots = this.filterTimeSlots.includes(key)
      ? this.filterTimeSlots.filter(k => k !== key)
      : [...this.filterTimeSlots, key];
  }

  clearFilters() {
    this.filterBusTypes = [];
    this.filterTimeSlots = [];
    this.filterMinSeats = 0;
    const items = this.allItems();
    if (items.length) {
      this.priceMin = Math.floor(Math.min(...items.map(i => i.basePrice)));
      this.priceMax = Math.ceil(Math.max(...items.map(i => i.basePrice)));
    }
  }

  busTypeCount(type: number): number {
    return this.allItems().filter(s => s.busType === type).length;
  }

  getTimeSlot(iso: string): string {
    const h = new Date(iso).getHours();
    if (h >= 6  && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'afternoon';
    if (h >= 18 && h < 22) return 'evening';
    return 'night';
  }

  timeSlotLabel(iso: string): string {
    const slot = this.getTimeSlot(iso);
    return this.timeSlots.find(s => s.key === slot)?.label ?? '';
  }

  selectBus(s: ScheduleResponse) {
    this.bookingState.setSchedule(s as any);
    this.router.navigate(['/booking/seats', s.id]);
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  busTypeLabel(t: number): string {
    const map: Record<number, string> = { 1: 'Seater', 2: 'Semi Sleeper', 3: 'Sleeper', 4: 'AC', 5: 'Non-AC' };
    return map[t] ?? 'Bus';
  }

  busTypeBadgeClass(t: number): string {
    const map: Record<number, string> = {
      1: 'bg-blue-100 text-blue-700',
      2: 'bg-purple-100 text-purple-700',
      3: 'bg-indigo-100 text-indigo-700',
      4: 'bg-cyan-100 text-cyan-700',
      5: 'bg-gray-100 text-gray-600',
    };
    return map[t] ?? 'bg-gray-100 text-gray-600';
  }
}
