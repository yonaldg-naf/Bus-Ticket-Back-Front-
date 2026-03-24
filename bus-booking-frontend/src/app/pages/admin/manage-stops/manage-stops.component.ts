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
    <div class="min-h-screen bg-gray-50">

      <!-- Page Header -->
      <div class="bg-white border-b border-gray-200 shadow-sm">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <a routerLink="/admin" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </a>
            <div class="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white text-base shadow-sm">📍</div>
            <div>
              <h1 class="text-lg font-bold text-gray-900">Stops & Cities</h1>
              <p class="text-sm text-gray-500">Manage bus stops across all cities</p>
            </div>
          </div>
          @if (selectedCity) {
            <button (click)="openAddStop()" class="btn-primary">+ Add Stop</button>
          }
        </div>

        <!-- Search + City Filter -->
        <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-4 flex flex-wrap gap-3 items-center">
          <div class="relative flex-1 min-w-[200px]">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input [(ngModel)]="searchQuery" placeholder="Search city or stop…"
              class="form-input pl-9 py-2 text-sm w-full"/>
          </div>
          @if (selectedCity) {
            <button (click)="clearSelectedCity()"
              class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              All Cities
            </button>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-orange-100 text-orange-700 border border-orange-200">
              🏙️ {{ selectedCity }}
            </span>
          }
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        <!-- CITY LIST -->
        @if (!selectedCity) {
          @if (loadingCities()) {
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              @for (_ of [1,2,3,4,5,6,7,8]; track $index) {
                <div class="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                  <div class="w-10 h-10 skeleton rounded-xl mb-3"></div>
                  <div class="h-4 skeleton w-24 rounded mb-2"></div>
                  <div class="h-3 skeleton w-16 rounded"></div>
                </div>
              }
            </div>
          } @else if (filteredCities().length === 0) {
            <div class="flex flex-col items-center justify-center py-20 text-center">
              <div class="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center text-4xl mb-4">🏙️</div>
              <h3 class="text-lg font-bold text-gray-800">No cities found</h3>
              <p class="text-gray-500 mt-1.5 text-sm">Try a different search term.</p>
            </div>
          } @else {
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              @for (city of filteredCities(); track city.city) {
                <button (click)="selectCity(city.city)"
                  class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-left hover:border-orange-300 hover:shadow-md transition-all group">
                  <div class="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-2xl mb-3 group-hover:bg-orange-100 transition-colors">🏙️</div>
                  <div class="font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">{{ city.city }}</div>
                  <p class="text-gray-400 text-xs mt-0.5">{{ city.stopCount }} stop{{ city.stopCount !== 1 ? 's' : '' }}</p>
                </button>
              }
            </div>
          }
        }

        <!-- STOPS LIST -->
        @if (selectedCity) {
          @if (loadingStops()) {
            <div class="space-y-3">
              @for (_ of [1,2,3,4]; track $index) {
                <div class="bg-white rounded-xl border border-gray-200 p-4 animate-pulse flex justify-between">
                  <div class="space-y-2"><div class="h-4 skeleton w-40 rounded"></div><div class="h-3 skeleton w-28 rounded"></div></div>
                  <div class="flex gap-2"><div class="h-8 skeleton w-14 rounded-lg"></div><div class="h-8 skeleton w-14 rounded-lg"></div></div>
                </div>
              }
            </div>
          } @else if (filteredStops().length === 0) {
            <div class="flex flex-col items-center justify-center py-20 text-center">
              <div class="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center text-4xl mb-4">📍</div>
              <h3 class="text-lg font-bold text-gray-800">No stops found</h3>
              <p class="text-gray-500 mt-1.5 text-sm">Add the first stop in {{ selectedCity }}.</p>
              <button (click)="openAddStop()" class="btn-primary mt-5">+ Add Stop</button>
            </div>
          } @else {
            <div class="space-y-3">
              @for (stop of filteredStops(); track stop.id) {
                <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow flex items-start justify-between gap-4">
                  <div class="flex items-start gap-3 flex-1 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-lg flex-shrink-0">📍</div>
                    <div class="min-w-0">
                      <p class="font-semibold text-gray-900">{{ stop.name }}</p>
                      <p class="text-xs text-gray-500 mt-0.5">{{ stop.city }}</p>
                      @if (stop.latitude && stop.longitude) {
                        <p class="text-xs text-gray-400 mt-1 font-mono">
                          {{ stop.latitude.toFixed(4) }}, {{ stop.longitude.toFixed(4) }}
                        </p>
                      }
                    </div>
                  </div>
                  <div class="flex gap-2 flex-shrink-0">
                    <button (click)="openEditStop(stop)" class="btn-secondary px-3 py-1.5 text-sm">Edit</button>
                    <button (click)="deleteStop(stop)"
                      class="px-3 py-1.5 text-sm font-medium rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- ADD STOP MODAL -->
      @if (showAddStop()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="font-bold text-gray-900">Add Stop</h2>
              <button (click)="closeAddStop()" class="text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="form-label">Stop Name *</label>
                <input [(ngModel)]="newStop.name" placeholder="e.g. Central Bus Stand" class="form-input"/>
              </div>
              <div>
                <label class="form-label">City *</label>
                <input [(ngModel)]="newStop.city" placeholder="e.g. Mumbai" class="form-input"/>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Latitude <span class="text-gray-400 font-normal">(optional)</span></label>
                  <input type="number" step="0.0001"
                    [ngModel]="newStop.latitude ?? ''"
                    (ngModelChange)="newStop.latitude = $any($event) !== '' ? +$event : null"
                    placeholder="19.0760" class="form-input"/>
                </div>
                <div>
                  <label class="form-label">Longitude <span class="text-gray-400 font-normal">(optional)</span></label>
                  <input type="number" step="0.0001"
                    [ngModel]="newStop.longitude ?? ''"
                    (ngModelChange)="newStop.longitude = $any($event) !== '' ? +$event : null"
                    placeholder="72.8777" class="form-input"/>
                </div>
              </div>
              <div class="flex gap-3 pt-2">
                <button (click)="closeAddStop()" class="btn-secondary flex-1 py-2.5">Cancel</button>
                <button (click)="submitAddStop()" class="btn-primary flex-1 py-2.5">Add Stop</button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- EDIT STOP MODAL -->
      @if (showEditStop() && editStopData()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="font-bold text-gray-900">Edit Stop</h2>
              <button (click)="closeEditStop()" class="text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="form-label">Stop Name *</label>
                <input [(ngModel)]="editStopData()!.name" class="form-input"/>
              </div>
              <div>
                <label class="form-label">City *</label>
                <input [(ngModel)]="editStopData()!.city" class="form-input"/>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Latitude <span class="text-gray-400 font-normal">(optional)</span></label>
                  <input type="number" step="0.0001"
                    [ngModel]="editStopData()!.latitude ?? ''"
                    (ngModelChange)="editStopData()!.latitude = $any($event) !== '' ? +$event : null"
                    class="form-input"/>
                </div>
                <div>
                  <label class="form-label">Longitude <span class="text-gray-400 font-normal">(optional)</span></label>
                  <input type="number" step="0.0001"
                    [ngModel]="editStopData()!.longitude ?? ''"
                    (ngModelChange)="editStopData()!.longitude = $any($event) !== '' ? +$event : null"
                    class="form-input"/>
                </div>
              </div>
              <div class="flex gap-3 pt-2">
                <button (click)="closeEditStop()" class="btn-secondary flex-1 py-2.5">Cancel</button>
                <button (click)="submitEditStop()" class="btn-primary flex-1 py-2.5">Save Changes</button>
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

  // Modal states
  showAddStop = signal(false);
  showEditStop = signal(false);

  // Data for ADD
  newStop = {
    city: '',
    name: '',
    latitude: null as number | null,
    longitude: null as number | null,
  };

  // Data for EDIT
  editStopData = signal<StopResponse | null>(null);

  filteredCities = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return this.cities().filter(c => c.city.toLowerCase().includes(q));
  });

  filteredStops = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return this.stops().filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.loadCities();
  }

  loadCities() {
    this.loadingCities.set(true);
    this.stopService.getCities().subscribe({
      next: (data) => { this.cities.set(data); this.loadingCities.set(false); },
      error: () => { this.toast.error('Failed to load cities.'); this.loadingCities.set(false); }
    });
  }

  selectCity(city: string) {
    this.selectedCity = city;
    this.newStop.city = city;
    this.loadStops();
  }

  clearSelectedCity() {
    this.selectedCity = '';
    this.stops.set([]);
  }

  onCityChange() {
    if (!this.selectedCity) { this.stops.set([]); return; }
    this.loadStops();
  }

  loadStops() {
    this.loadingStops.set(true);
    this.stopService.getStopsByCity(this.selectedCity).subscribe({
      next: (data) => { this.stops.set(data); this.loadingStops.set(false); },
      error: () => { this.toast.error('Failed to load stops'); this.loadingStops.set(false); }
    });
  }

  // ---------------------
  // ADD STOP
  // ---------------------
  openAddStop() {
    this.newStop = { city: this.selectedCity, name: '', latitude: null, longitude: null };
    this.showAddStop.set(true);
  }
  closeAddStop() { this.showAddStop.set(false); }
  submitAddStop() {
    this.stopService.createStop(this.newStop).subscribe({
      next: () => { this.toast.success('Stop added'); this.closeAddStop(); this.loadStops(); this.loadCities(); },
      error: () => this.toast.error('Failed to add stop')
    });
  }

  // ---------------------
  // EDIT STOP
  // ---------------------
  openEditStop(stop: StopResponse) { this.editStopData.set({ ...stop }); this.showEditStop.set(true); }
  closeEditStop() { this.showEditStop.set(false); }
  submitEditStop() {
    const stop = this.editStopData();
    if (!stop) return;
    this.stopService.updateStop(stop.id, {
      city: stop.city,
      name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
    }).subscribe({
      next: () => { this.toast.success('Stop updated'); this.closeEditStop(); this.loadStops(); this.loadCities(); },
      error: () => this.toast.error('Failed to update stop')
    });
  }

  // ---------------------
  // DELETE STOP
  // ---------------------
  deleteStop(stop: StopResponse) {
    if (!confirm(`Delete stop "${stop.name}"?`)) return;
    this.stopService.deleteStop(stop.id).subscribe({
      next: () => { this.toast.success('Stop deleted'); this.loadStops(); this.loadCities(); },
      error: () => this.toast.error('Failed to delete stop')
    });
  }
}