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
            <span class="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
              {{ items().length }} bus{{ items().length !== 1 ? 'es' : '' }} available
            </span>
          }
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 text-xs text-gray-500">
            <span class="font-medium">Sort by</span>
            <select [(ngModel)]="sortBy" (ngModelChange)="reload()"
              class="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 font-medium text-gray-700">
              <option value="departure">Departure ↑</option>
              <option value="price">Price ↑</option>
              <option value="busCode">Bus Code</option>
            </select>
          </div>
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

      <!-- Empty state -->
      @if (!loading() && items().length === 0) {
        <div class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center text-5xl mb-5 shadow-inner">🔍</div>
          <h3 class="text-xl font-bold text-gray-800">No buses found</h3>
          <p class="text-gray-500 mt-2 max-w-xs text-sm">
            No buses available for this route on {{ dateDisplay() }}. Try a different date.
          </p>
          <a routerLink="/home" class="btn-primary mt-6 px-6 py-3">← Change Search</a>
        </div>
      }

      <!-- Results -->
      <div class="space-y-4">
        @for (s of items(); track s.id) {
          <div class="bus-card group">
            <div class="p-5 sm:p-6">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

                <!-- Left: operator + timing -->
                <div class="flex items-start gap-4 flex-1 min-w-0">
                  <!-- Operator avatar -->
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

  featureTags = ['Instant Confirmation', 'Seat Selection', 'E-Ticket', 'Free Cancellation'];

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
