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
    <div class="min-h-screen bg-[#1f1f1f] text-white px-4 py-10">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <a routerLink="/admin" class="text-[var(--accent)] hover:underline text-sm">
            ← Admin Dashboard
          </a>
          <h1 class="text-2xl font-extrabold tracking-tight mt-1">Stops & Cities</h1>
        </div>

        <!-- Add Stop Button -->
        @if (selectedCity) {
          <button (click)="openAddStop()"
                  class="bg-[var(--accent)] hover:bg-[#d32f2f] text-white font-semibold h-9 px-4 rounded">
            + Add Stop
          </button>
        }
      </div>

      <!-- Search + Filter -->
      <div class="flex flex-col sm:flex-row gap-3 mb-6">
        <input [(ngModel)]="searchQuery"
               placeholder="Search city or stop..."
               class="bg-[#2a2a2a] border border-gray-700 rounded px-3 py-2 flex-1" />

        <select [(ngModel)]="selectedCity"
                (ngModelChange)="onCityChange()"
                class="bg-[#2a2a2a] border border-gray-700 rounded px-3 py-2">
          <option value="">All cities</option>
          @for (c of filteredCities(); track c.city) {
            <option [value]="c.city">
              {{ c.city }} ({{ c.stopCount }})
            </option>
          }
        </select>
      </div>

      <!-- CITY LIST -->
      @if (!selectedCity) {
        <h2 class="text-sm font-semibold text-gray-400 uppercase mb-3">Cities</h2>

        @if (loadingCities()) {
          <div class="flex justify-center py-12">
            <svg class="animate-spin w-7 h-7 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        }

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          @for (city of filteredCities(); track city.city) {
            <button (click)="selectCity(city.city)"
                    class="bg-[#2a2a2a] hover:bg-[#333333] rounded-xl p-4 text-left transition">
              <div class="text-3xl mb-2">🏙️</div>
              <div class="font-semibold">{{ city.city }}</div>
              <p class="text-gray-400 text-xs">{{ city.stopCount }} stop{{ city.stopCount !== 1 ? 's' : '' }}</p>
            </button>
          }
        </div>
      }

      <!-- STOPS LIST -->
      @if (selectedCity) {
        <div class="flex items-center justify-between mb-4">
          <button class="text-[var(--accent)] hover:underline text-sm flex items-center gap-1"
                  (click)="clearSelectedCity()">
            ← All cities
          </button>
          <h2 class="font-bold text-white">{{ selectedCity }}</h2>
        </div>

        @if (loadingStops()) {
          <div class="flex justify-center py-12">
            <svg class="animate-spin w-7 h-7 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        }

        <div class="space-y-2">
          @for (stop of filteredStops(); track stop.id) {
            <div class="bg-[#2a2a2a] rounded-xl p-4 flex items-start justify-between">
              <div>
                <div class="font-semibold text-white">{{ stop.name }}</div>
                <div class="text-gray-400 text-xs">{{ stop.city }}</div>

                @if (stop.latitude && stop.longitude) {
                  <div class="text-gray-400 text-xs mt-1">
                    📍 {{ stop.latitude.toFixed(4) }}, {{ stop.longitude.toFixed(4) }}
                  </div>
                }
              </div>

              <div class="flex items-center gap-2">
                <button class="bg-gray-700 hover:bg-gray-600 rounded px-3 py-1 text-sm"
                        (click)="openEditStop(stop)">
                  Edit
                </button>
                <button class="bg-red-700 hover:bg-red-600 rounded px-3 py-1 text-sm"
                        (click)="deleteStop(stop)">
                  Delete
                </button>
              </div>
            </div>
          }

          @if (!loadingStops() && filteredStops().length === 0) {
            <div class="text-center py-10 text-gray-400">No stops found in {{ selectedCity }}</div>
          }
        </div>
      }

      <!-- ===========================
           ADD STOP MODAL
      ============================ -->
      @if (showAddStop()) {
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div class="bg-[#2a2a2a] rounded-xl w-full max-w-lg p-6 space-y-4">
            <h2 class="font-bold text-lg text-white">Add Stop</h2>

            <div>
              <label class="text-gray-300">Stop Name</label>
              <input [(ngModel)]="newStop.name" class="bg-[#1f1f1f] border border-gray-800 rounded px-3 py-2 w-full" />
            </div>

            <div>
              <label class="text-gray-300">City</label>
              <input [(ngModel)]="newStop.city" class="bg-[#1f1f1f] border border-gray-800 rounded px-3 py-2 w-full" />
            </div>

            <div class="flex gap-3">
              <div class="flex-1">
                <label class="text-gray-300">Latitude</label>
                <input type="number" step="0.0001"
                       [ngModel]="newStop.latitude ?? ''"
                       (ngModelChange)="newStop.latitude = $any($event) !== '' ? +$event : null"
                       class="bg-[#1f1f1f] border border-gray-800 rounded px-3 py-2 w-full" />
              </div>

              <div class="flex-1">
                <label class="text-gray-300">Longitude</label>
                <input type="number" step="0.0001"
                       [ngModel]="newStop.longitude ?? ''"
                       (ngModelChange)="newStop.longitude = $any($event) !== '' ? +$event : null"
                       class="bg-[#1f1f1f] border border-gray-800 rounded px-3 py-2 w-full" />
              </div>
            </div>

            <div class="flex gap-2 pt-2">
              <button class="bg-gray-700 hover:bg-gray-600 rounded px-4 py-2 flex-1"
                      (click)="closeAddStop()">
                Cancel
              </button>
              <button class="bg-[var(--accent)] hover:bg-[#d32f2f] rounded px-4 py-2 flex-1"
                      (click)="submitAddStop()">
                Add Stop
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ===========================
           EDIT STOP MODAL
      ============================ -->
      @if (showEditStop() && editStopData()) {
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div class="bg-[#2a2a2a] rounded-xl w-full max-w-lg p-6 space-y-4">
            <h2 class="font-bold text-lg text-white">Edit Stop</h2>

            <div>
              <label class="text-gray-300">Stop Name</label>
              <input [(ngModel)]="editStopData().name" class="bg-[#1f1f1f] border border-gray-800 rounded px-3 py-2 w-full" />
            </div>

            <div>
              <label class="text-gray-300">City</label>
              <input [(ngModel)]="editStopData().city" class="bg-[#1f1f1f] border border-gray-800 rounded px-3 py-2 w-full" />
            </div>

            <div class="flex gap-3">
              <div class="flex-1">
                <label class="text-gray-300">Latitude</label>
                <input type="number" step="0.0001"
                       [ngModel]="editStopData().latitude ?? ''"
                       (ngModelChange)="editStopData().latitude = $any($event) !== '' ? +$event : null"
                       class="bg-[#1f1f1f] border border-gray-800 rounded px-3 py-2 w-full" />
              </div>

              <div class="flex-1">
                <label class="text-gray-300">Longitude</label>
                <input type="number" step="0.0001"
                       [ngModel]="editStopData().longitude ?? ''"
                       (ngModelChange)="editStopData().longitude = $any($event) !== '' ? +$event : null"
                       class="bg-[#1f1f1f] border border-gray-800 rounded px-3 py-2 w-full" />
              </div>
            </div>

            <div class="flex gap-2 pt-2">
              <button class="bg-gray-700 hover:bg-gray-600 rounded px-4 py-2 flex-1"
                      (click)="closeEditStop()">
                Cancel
              </button>
              <button class="bg-[var(--accent)] hover:bg-[#d32f2f] rounded px-4 py-2 flex-1"
                      (click)="submitEditStop()">
                Save Changes
              </button>
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