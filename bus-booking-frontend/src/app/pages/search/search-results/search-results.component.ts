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
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <!-- Sticky search bar -->
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-16 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3 text-sm">
          <div class="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
            <span>{{ fromCity() }}</span>
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
            <span>{{ toCity() }}</span>
          </div>
          <span class="text-slate-300 dark:text-slate-600 hidden sm:inline">·</span>
          <span class="text-slate-500 dark:text-slate-400 text-sm hidden sm:inline">{{ dateDisplay() }}</span>
          @if (!loading()) {
            <span class="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
              {{ totalCount() }} result{{ totalCount() !== 1 ? 's' : '' }}
            </span>
          }
        </div>
        <div class="flex items-center gap-2">
          <button (click)="filtersOpen.update(v => !v)"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl border transition-colors"
            [class]="filtersOpen() ? 'border-red-400 text-red-600 bg-red-50' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-red-300 hover:text-red-600'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
            </svg>
            Filters
            @if (activeFilterCount() > 0) {
              <span class="w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center font-bold">{{ activeFilterCount() }}</span>
            }
          </button>
          <select [(ngModel)]="sortBy" (ngModelChange)="onSortChange()"
            class="text-sm px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 font-medium text-slate-700">
            <option value="departure|asc">Departure ↑ Earliest</option>
            <option value="departure|desc">Departure ↓ Latest</option>
            <option value="price|asc">Price ↑ Cheapest</option>
            <option value="price|desc">Price ↓ Expensive</option>
            <option value="busCode|asc">Bus Code A–Z</option>
          </select>
          <a routerLink="/home"
            class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl hover:border-red-300 hover:text-red-600 transition-colors">
            ← Edit Search
          </a>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div class="flex gap-6 items-start">

        <!-- Filter Sidebar -->
        @if (filtersOpen()) {
          <aside class="w-64 flex-shrink-0 hidden lg:block">
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-32 overflow-hidden">
              <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 class="font-bold text-slate-900 dark:text-white text-sm">Filters</h3>
                @if (activeFilterCount() > 0) {
                  <button (click)="clearFilters()" class="text-xs text-red-600 font-semibold hover:underline">Clear all</button>
                }
              </div>
              <div class="p-4 space-y-5">

                <!-- Bus Type -->
                <div>
                  <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Bus Type</p>
                  <div class="space-y-2">
                    @for (bt of busTypeOptions; track bt.value) {
                      <label class="flex items-center gap-2.5 cursor-pointer group">
                        <input type="checkbox" [checked]="filterBusTypes.includes(bt.value)"
                          (change)="toggleBusType(bt.value)"
                          class="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"/>
                        <span class="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white flex-1">{{ bt.label }}</span>
                        <span class="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{{ busTypeCount(bt.value) }}</span>
                      </label>
                    }
                  </div>
                </div>

                <!-- Departure Time -->
                <div>
                  <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Departure Time</p>
                  <div class="grid grid-cols-2 gap-2">
                    @for (slot of timeSlots; track slot.key) {
                      <button (click)="toggleTimeSlot(slot.key)"
                        class="flex flex-col items-center p-2.5 rounded-xl border-2 text-xs font-medium transition-all"
                        [class]="filterTimeSlots().includes(slot.key) ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'">
                        <span class="text-base mb-0.5">{{ slot.icon }}</span>
                        <span class="font-semibold">{{ slot.label }}</span>
                        <span class="text-slate-400 dark:text-slate-500 font-normal text-[10px]">{{ slot.time }}</span>
                      </button>
                    }
                  </div>
                </div>

                <!-- Price Range -->
                <div>
                  <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Price Range</p>
                  <div class="space-y-3">
                    <div class="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white">
                      <span>₹{{ priceMin }}</span>
                      <span>₹{{ priceMax }}</span>
                    </div>
                    <input type="range" [(ngModel)]="priceMin" [min]="absMinPrice" [max]="priceMax - 1" step="50"
                      (change)="applyBackendFilters()"
                      class="w-full accent-red-600 cursor-pointer"/>
                    <input type="range" [(ngModel)]="priceMax" [min]="priceMin + 1" [max]="absMaxPrice" step="50"
                      (change)="applyBackendFilters()"
                      class="w-full accent-red-600 cursor-pointer"/>
                    <div class="flex justify-between text-xs text-slate-400 dark:text-slate-500">
                      <span>₹{{ absMinPrice }}</span>
                      <span>₹{{ absMaxPrice }}</span>
                    </div>
                  </div>
                </div>

                <!-- Amenities -->
                <div>
                  <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Amenities</p>
                  <div class="space-y-2">
                    @for (a of amenityOptions; track a.key) {
                      <label class="flex items-center gap-2.5 cursor-pointer group">
                        <input type="checkbox" [checked]="filterAmenities.includes(a.key)"
                          (change)="toggleAmenity(a.key)"
                          class="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"/>
                        <span class="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white flex items-center gap-1.5">
                          <span>{{ a.icon }}</span>{{ a.label }}
                        </span>
                      </label>
                    }
                  </div>
                </div>

              </div>
            </div>
          </aside>
        }

        <!-- Results -->
        <div class="flex-1 min-w-0">

          <!-- Mobile filter bar -->
          @if (filtersOpen()) {
            <div class="lg:hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 mb-4 space-y-4">
              <div>
                <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Bus Type</p>
                <div class="flex flex-wrap gap-2">
                  @for (bt of busTypeOptions; track bt.value) {
                    <button (click)="toggleBusType(bt.value)"
                      class="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
                      [class]="filterBusTypes.includes(bt.value) ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'">
                      {{ bt.label }}
                    </button>
                  }
                </div>
              </div>
              <div>
                <p class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Departure Time</p>
                <div class="flex flex-wrap gap-2">
                  @for (slot of timeSlots; track slot.key) {
                    <button (click)="toggleTimeSlot(slot.key)"
                      class="px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all"
                      [class]="filterTimeSlots().includes(slot.key) ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'">
                      {{ slot.icon }} {{ slot.label }}
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Loading -->
          @if (loading()) {
            <div class="space-y-4">
              @for (_ of [1,2,3,4]; track $index) {
                <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex items-start gap-4 flex-1">
                      <div class="w-14 h-14 skeleton rounded-2xl"></div>
                      <div class="space-y-2 flex-1">
                        <div class="h-5 skeleton w-40 rounded"></div>
                        <div class="h-4 skeleton w-56 rounded"></div>
                        <div class="h-4 skeleton w-32 rounded"></div>
                      </div>
                    </div>
                    <div class="space-y-2 text-right">
                      <div class="h-8 skeleton w-24 rounded ml-auto"></div>
                      <div class="h-10 skeleton w-28 rounded-xl ml-auto"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- No results from API -->
          @if (!loading() && allItems().length === 0) {
            <div class="flex flex-col items-center justify-center py-24 text-center">
              <div class="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-3xl flex items-center justify-center text-5xl mb-5">🔍</div>
              <h3 class="text-xl font-bold text-slate-800 dark:text-white">No buses found</h3>
              <p class="text-slate-500 dark:text-slate-400 mt-2 max-w-xs text-sm">No buses available for this route on {{ dateDisplay() }}.</p>
              <a routerLink="/home" class="btn-primary mt-6 px-6 py-3">← Change Search</a>
            </div>
          }

          <!-- Filters too strict -->
          @if (!loading() && allItems().length > 0 && displayItems().length === 0) {
            <div class="flex flex-col items-center justify-center py-20 text-center">
              <div class="text-5xl mb-4">🎛️</div>
              <h3 class="text-lg font-bold text-slate-800 dark:text-white">No buses match your filters</h3>
              <p class="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">Try relaxing your filter criteria</p>
              <button (click)="clearFilters()" class="btn-primary mt-5 px-6 py-2.5">Clear Filters</button>
            </div>
          }

          <!-- Results list -->
          <div class="space-y-4">
            @for (s of displayItems(); track s.id) {
              <div class="bus-card group">
                <div class="p-5 sm:p-6">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

                    <!-- Left -->
                    <div class="flex items-start gap-4 flex-1 min-w-0">
                      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0 shadow-md shadow-red-200">
                        {{ s.busCode.slice(0,2).toUpperCase() }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                          <h3 class="font-extrabold text-slate-900 dark:text-white text-base">{{ s.busCode }}</h3>
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold" [class]="busTypeBadgeClass(s.busType)">
                            {{ busTypeLabel(s.busType) }}
                          </span>
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                            {{ timeSlotLabel(s.departureUtc) }}
                          </span>
                        </div>
                        <p class="text-xs text-slate-400 dark:text-slate-500 font-mono mb-2">{{ s.registrationNumber }}</p>
                        <div class="flex items-center gap-3 text-sm">
                          <div class="text-center">
                            <p class="font-bold text-slate-900 dark:text-white text-base">{{ formatTime(s.departureUtc) }}</p>
                            <p class="text-xs text-slate-400 dark:text-slate-500">{{ formatDate(s.departureUtc) }}</p>
                          </div>
                          <div class="flex-1 flex items-center gap-1 min-w-[60px]">
                            <div class="flex-1 h-px bg-slate-200 dark:bg-slate-600"></div>
                            <span class="text-xs text-slate-400 dark:text-slate-500 px-1">{{ s.routeCode }}</span>
                            <div class="flex-1 h-px bg-slate-200 dark:bg-slate-600"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Right -->
                    <div class="flex items-center gap-5 flex-shrink-0">
                      <div class="text-right">
                        <div class="flex items-center justify-end gap-1.5 mb-1">
                          <span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                          <span class="text-xs text-green-600 font-semibold">{{ s.totalSeats }} seats</span>
                        </div>
                        <p class="text-2xl font-extrabold text-slate-900 dark:text-white">₹{{ s.basePrice | number:'1.0-0' }}</p>
                        <p class="text-xs text-slate-400 dark:text-slate-500">per seat</p>
                      </div>
                      <button (click)="selectBus(s)"
                        class="px-5 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-200 whitespace-nowrap text-sm">
                        Select Seats →
                      </button>
                    </div>
                  </div>

                  <!-- Amenity tags -->
                  <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 flex-wrap">
                    @for (tag of amenityTags(s); track tag.label) {
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        <span>{{ tag.icon }}</span>{{ tag.label }}
                      </span>
                    }
                    <span class="ml-auto text-xs text-slate-300 dark:text-slate-600 font-mono">{{ s.id.slice(0,8) }}…</span>
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
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private scheduleSvc  = inject(ScheduleService);
  private bookingState = inject(BookingStateService);
  private toast        = inject(ToastService);

  loading    = signal(true);
  allItems   = signal<ScheduleResponse[]>([]);
  totalCount = signal(0);
  filtersOpen = signal(false);

  fromCity   = signal('');
  toCity     = signal('');
  travelDate = signal('');

  // Sort — format: "field|dir"
  sortBy = 'departure|asc';

  // Client-side filters (applied after backend fetch)
  filterBusTypes: number[] = [];
  filterTimeSlots = signal<string[]>([]);
  filterAmenities: string[] = [];
  priceMin = 0;
  priceMax = 9999;
  absMinPrice = 0;
  absMaxPrice = 9999;

  busTypeOptions = [
    { value: 1, label: 'Seater'      },
    { value: 2, label: 'Semi Sleeper'},
    { value: 3, label: 'Sleeper'     },
    { value: 4, label: 'AC'          },
    { value: 5, label: 'Non-AC'      },
  ];

  timeSlots = [
    { key: 'morning',   label: 'Morning',   icon: '🌅', time: '6am–12pm' },
    { key: 'afternoon', label: 'Afternoon', icon: '☀️', time: '12pm–6pm' },
    { key: 'evening',   label: 'Evening',   icon: '🌆', time: '6pm–10pm' },
    { key: 'night',     label: 'Night',     icon: '🌙', time: '10pm–6am' },
  ];

  amenityOptions = [
    { key: 'ac',       label: 'Air Conditioning', icon: '❄️' },
    { key: 'sleeper',  label: 'Sleeper Berths',   icon: '🛏️' },
    { key: 'charging', label: 'Charging Point',   icon: '🔌' },
    { key: 'blanket',  label: 'Blanket & Pillow', icon: '🛌' },
    { key: 'water',    label: 'Water Bottle',     icon: '💧' },
  ];

  // Derive amenities from busType
  private busTypeAmenities(busType: number): string[] {
    const map: Record<number, string[]> = {
      1: ['charging', 'water'],                          // Seater
      2: ['charging', 'water', 'blanket'],               // SemiSleeper
      3: ['sleeper', 'charging', 'water', 'blanket'],    // Sleeper
      4: ['ac', 'charging', 'water', 'blanket'],         // AC
      5: ['charging', 'water'],                          // NonAC
    };
    return map[busType] ?? [];
  }

  amenityTags(s: ScheduleResponse): { icon: string; label: string }[] {
    const amenities = this.busTypeAmenities(s.busType);
    return this.amenityOptions.filter(a => amenities.includes(a.key));
  }

  activeFilterCount = computed(() => {
    let c = 0;
    if (this.filterBusTypes.length) c++;
    if (this.filterTimeSlots().length) c++;
    if (this.priceMin > this.absMinPrice || this.priceMax < this.absMaxPrice) c++;
    if (this.filterAmenities.length) c++;
    return c;
  });

  // Client-side filter on top of backend results (for time-slot, price range, amenities)
  displayItems = computed(() => {
    let list = this.allItems();
    if (this.filterTimeSlots().length)
      list = list.filter(s => this.filterTimeSlots().includes(this.getTimeSlot(s.departureUtc)));
    list = list.filter(s => s.basePrice >= this.priceMin && s.basePrice <= this.priceMax);
    if (this.filterAmenities.length) {
      list = list.filter(s => {
        const has = this.busTypeAmenities(s.busType);
        return this.filterAmenities.every(a => has.includes(a));
      });
    }
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
    const [field, dir] = this.sortBy.split('|');
    this.scheduleSvc.searchByKeys({
      fromCity: this.fromCity(),
      toCity:   this.toCity(),
      date:     this.travelDate(),
      sortBy:   field,
      sortDir:  dir,
      pageSize: 100,
      // Pass busType to backend if single type selected
      busType:  this.filterBusTypes.length === 1 ? this.filterBusTypes[0] : undefined,
      minPrice: this.priceMin > this.absMinPrice ? this.priceMin : undefined,
      maxPrice: this.priceMax < this.absMaxPrice ? this.priceMax : undefined,
    }).subscribe({
      next: (res: any) => {
        const items: ScheduleResponse[] = res?.items ?? res ?? [];
        this.allItems.set(items);
        this.totalCount.set(res?.totalCount ?? items.length);
        if (items.length) {
          const min = Math.floor(Math.min(...items.map(i => i.basePrice)));
          const max = Math.ceil(Math.max(...items.map(i => i.basePrice)));
          this.absMinPrice = min;
          this.absMaxPrice = max;
          if (this.priceMin === 0 && this.priceMax === 9999) {
            this.priceMin = min;
            this.priceMax = max;
          }
        }
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.toast.error('Failed to load schedules.'); },
    });
  }

  onSortChange() { this.reload(); }

  applyBackendFilters() { this.reload(); }

  toggleBusType(val: number) {
    this.filterBusTypes = this.filterBusTypes.includes(val)
      ? this.filterBusTypes.filter(v => v !== val)
      : [...this.filterBusTypes, val];
    this.reload();
  }

  toggleTimeSlot(key: string) {
    this.filterTimeSlots.update(slots =>
      slots.includes(key) ? slots.filter(k => k !== key) : [...slots, key]
    );
    // Time slot is client-side only (no backend param), no reload needed
  }

  toggleAmenity(key: string) {
    this.filterAmenities = this.filterAmenities.includes(key)
      ? this.filterAmenities.filter(k => k !== key)
      : [...this.filterAmenities, key];
    // client-side only, no reload
  }

  clearFilters() {
    this.filterBusTypes = [];
    this.filterTimeSlots.set([]);
    this.filterAmenities = [];
    this.priceMin = this.absMinPrice;
    this.priceMax = this.absMaxPrice;
    this.reload();
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
    return ({1:'Seater',2:'Semi Sleeper',3:'Sleeper',4:'AC',5:'Non-AC'} as any)[t] ?? 'Bus';
  }

  busTypeBadgeClass(t: number): string {
    return ({
      1:'bg-blue-100 text-blue-700', 2:'bg-purple-100 text-purple-700',
      3:'bg-indigo-100 text-indigo-700', 4:'bg-cyan-100 text-cyan-700', 5:'bg-gray-100 text-gray-600',
    } as any)[t] ?? 'bg-gray-100 text-gray-600';
  }
}