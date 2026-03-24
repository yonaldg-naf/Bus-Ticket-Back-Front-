import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StopService } from '../../../services/stop.service';
import { CityResponse, StopResponse } from '../../../models/stop-route.models';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-manage-stops',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50">

      <!-- Top Bar -->
      <div class="bg-white border-b border-slate-200">
        <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <a routerLink="/admin" class="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </a>
            <div>
              <h1 class="text-xl font-semibold text-slate-900">Stops & Cities</h1>
              <p class="text-sm text-slate-500 mt-0.5">
                @if (selectedCity) { {{ filteredStops().length }} stops in {{ selectedCity }} }
                @else { {{ cities().length }} cities configured }
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            @if (selectedCity) {
              <button (click)="clearSelectedCity()"
                class="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                All Cities
              </button>
              <button (click)="openAddStop()"
                class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Add Stop
              </button>
            }
          </div>
        </div>

        <!-- Search -->
        <div class="max-w-7xl mx-auto px-6 pb-4">
          <div class="relative max-w-sm">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input [(ngModel)]="searchQuery" placeholder="Search city or stop…"
              class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-6 py-6">

        <!-- CITY GRID -->
        @if (!selectedCity) {
          @if (loadingCities()) {
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              @for (_ of [1,2,3,4,5,6,7,8,9,10]; track $index) {
                <div class="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                  <div class="w-10 h-10 bg-slate-200 rounded-lg mb-3"></div>
                  <div class="h-4 bg-slate-200 rounded w-20 mb-2"></div>
                  <div class="h-3 bg-slate-100 rounded w-14"></div>
                </div>
              }
            </div>
          } @else if (filteredCities().length === 0) {
            <div class="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-center">
              <div class="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <svg class="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <p class="font-semibold text-slate-700">No cities found</p>
              <p class="text-sm text-slate-400 mt-1">Try a different search term</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              @for (city of filteredCities(); track city.city) {
                <button (click)="selectCity(city.city)"
                  class="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-red-300 hover:shadow-md transition-all group">
                  <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-red-50 transition-colors">
                    <svg class="w-5 h-5 text-slate-500 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  <p class="font-semibold text-slate-900 group-hover:text-red-700 transition-colors text-sm">{{ city.city }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">{{ city.stopCount }} stop{{ city.stopCount !== 1 ? 's' : '' }}</p>
                </button>
              }
            </div>
          }
        }

        <!-- STOPS LIST -->
        @if (selectedCity) {
          @if (loadingStops()) {
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
              @for (_ of [1,2,3,4]; track $index) {
                <div class="px-6 py-4 border-b border-slate-100 animate-pulse flex items-center justify-between">
                  <div class="space-y-2">
                    <div class="h-4 bg-slate-200 rounded w-40"></div>
                    <div class="h-3 bg-slate-100 rounded w-28"></div>
                  </div>
                  <div class="flex gap-2">
                    <div class="h-8 w-14 bg-slate-200 rounded-lg"></div>
                    <div class="h-8 w-14 bg-slate-200 rounded-lg"></div>
                  </div>
                </div>
              }
            </div>
          } @else if (filteredStops().length === 0) {
            <div class="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-center">
              <div class="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <svg class="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                </svg>
              </div>
              <p class="font-semibold text-slate-700">No stops in {{ selectedCity }}</p>
              <p class="text-sm text-slate-400 mt-1">Add the first stop for this city</p>
              <button (click)="openAddStop()" class="mt-4 px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                Add Stop
              </button>
            </div>
          } @else {
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div class="px-6 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stops in {{ selectedCity }}</span>
                <span class="text-xs text-slate-400">{{ filteredStops().length }} stops</span>
              </div>
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-100 text-left">
                    <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stop Name</th>
                    <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">City</th>
                    <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Coordinates</th>
                    <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (stop of filteredStops(); track stop.id) {
                    <tr class="hover:bg-slate-50/60 transition-colors">
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                            <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                          </div>
                          <span class="font-medium text-slate-900">{{ stop.name }}</span>
                        </div>
                      </td>
                      <td class="px-6 py-4 text-slate-500 hidden md:table-cell">{{ stop.city }}</td>
                      <td class="px-6 py-4 hidden lg:table-cell">
                        @if (stop.latitude && stop.longitude) {
                          <span class="font-mono text-xs text-slate-400">{{ stop.latitude.toFixed(4) }}, {{ stop.longitude.toFixed(4) }}</span>
                        } @else {
                          <span class="text-slate-300 text-xs">—</span>
                        }
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center justify-end gap-2">
                          <button (click)="openEditStop(stop)"
                            class="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                            Edit
                          </button>
                          <button (click)="deleteStop(stop)"
                            class="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>

      <!-- ADD STOP MODAL -->
      @if (showAddStop()) {
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 class="font-semibold text-slate-900">Add New Stop</h2>
              <button (click)="closeAddStop()" class="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Stop Name *</label>
                <input [(ngModel)]="newStop.name" placeholder="e.g. Central Bus Stand"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">City *</label>
                <input [(ngModel)]="newStop.city" placeholder="e.g. Mumbai"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Latitude <span class="text-slate-400 font-normal normal-case">(optional)</span></label>
                  <input type="number" step="0.0001"
                    [ngModel]="newStop.latitude ?? ''"
                    (ngModelChange)="newStop.latitude = $any($event) !== '' ? +$event : null"
                    placeholder="19.0760"
                    class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Longitude <span class="text-slate-400 font-normal normal-case">(optional)</span></label>
                  <input type="number" step="0.0001"
                    [ngModel]="newStop.longitude ?? ''"
                    (ngModelChange)="newStop.longitude = $any($event) !== '' ? +$event : null"
                    placeholder="72.8777"
                    class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
                </div>
              </div>
              <div class="flex gap-3 pt-2">
                <button (click)="closeAddStop()"
                  class="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button (click)="submitAddStop()"
                  class="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                  Add Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- EDIT STOP MODAL -->
      @if (showEditStop() && editStopData()) {
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 class="font-semibold text-slate-900">Edit Stop</h2>
              <button (click)="closeEditStop()" class="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Stop Name *</label>
                <input [(ngModel)]="editStopData()!.name"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">City *</label>
                <input [(ngModel)]="editStopData()!.city"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Latitude <span class="text-slate-400 font-normal normal-case">(optional)</span></label>
                  <input type="number" step="0.0001"
                    [ngModel]="editStopData()!.latitude ?? ''"
                    (ngModelChange)="editStopData()!.latitude = $any($event) !== '' ? +$event : null"
                    class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Longitude <span class="text-slate-400 font-normal normal-case">(optional)</span></label>
                  <input type="number" step="0.0001"
                    [ngModel]="editStopData()!.longitude ?? ''"
                    (ngModelChange)="editStopData()!.longitude = $any($event) !== '' ? +$event : null"
                    class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
                </div>
              </div>
              <div class="flex gap-3 pt-2">
                <button (click)="closeEditStop()"
                  class="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button (click)="submitEditStop()"
                  class="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class ManageStopsComponent implements OnInit {
  private stopService = inject(StopService);
  private toast = inject(ToastService);

  cities = signal<CityResponse[]>([]);
  stops = signal<StopResponse[]>([]);
  loadingCities = signal(true);
  loadingStops = signal(false);

  selectedCity = '';
  searchQuery = '';

  showAddStop = signal(false);
  showEditStop = signal(false);

  newStop = { city: '', name: '', latitude: null as number | null, longitude: null as number | null };
  editStopData = signal<StopResponse | null>(null);

  filteredCities = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return this.cities().filter(c => c.city.toLowerCase().includes(q));
  });

  filteredStops = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return this.stops().filter(s => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q));
  });

  ngOnInit(): void { this.loadCities(); }

  loadCities() {
    this.loadingCities.set(true);
    this.stopService.getCities().subscribe({
      next: (data) => { this.cities.set(data); this.loadingCities.set(false); },
      error: () => { this.toast.error('Failed to load cities.'); this.loadingCities.set(false); }
    });
  }

  selectCity(city: string) { this.selectedCity = city; this.newStop.city = city; this.loadStops(); }
  clearSelectedCity() { this.selectedCity = ''; this.stops.set([]); }

  loadStops() {
    this.loadingStops.set(true);
    this.stopService.getStopsByCity(this.selectedCity).subscribe({
      next: (data) => { this.stops.set(data); this.loadingStops.set(false); },
      error: () => { this.toast.error('Failed to load stops'); this.loadingStops.set(false); }
    });
  }

  openAddStop() { this.newStop = { city: this.selectedCity, name: '', latitude: null, longitude: null }; this.showAddStop.set(true); }
  closeAddStop() { this.showAddStop.set(false); }
  submitAddStop() {
    this.stopService.createStop(this.newStop).subscribe({
      next: () => { this.toast.success('Stop added'); this.closeAddStop(); this.loadStops(); this.loadCities(); },
      error: () => this.toast.error('Failed to add stop')
    });
  }

  openEditStop(stop: StopResponse) { this.editStopData.set({ ...stop }); this.showEditStop.set(true); }
  closeEditStop() { this.showEditStop.set(false); }
  submitEditStop() {
    const stop = this.editStopData();
    if (!stop) return;
    this.stopService.updateStop(stop.id, { city: stop.city, name: stop.name, latitude: stop.latitude, longitude: stop.longitude }).subscribe({
      next: () => { this.toast.success('Stop updated'); this.closeEditStop(); this.loadStops(); this.loadCities(); },
      error: () => this.toast.error('Failed to update stop')
    });
  }

  deleteStop(stop: StopResponse) {
    if (!confirm(`Delete stop "${stop.name}"?`)) return;
    this.stopService.deleteStop(stop.id).subscribe({
      next: () => { this.toast.success('Stop deleted'); this.loadStops(); this.loadCities(); },
      error: () => this.toast.error('Failed to delete stop')
    });
  }
}
