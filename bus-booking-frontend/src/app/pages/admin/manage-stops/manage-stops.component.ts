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
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-6">
        <div>
          <a routerLink="/admin" class="text-sm text-indigo-600 hover:text-indigo-800">← Admin Dashboard</a>
          <h1 class="text-2xl font-bold text-slate-800 mt-1">Stops & Cities</h1>
        </div>
      </div>

      <!-- City filter -->
      <div class="flex flex-col sm:flex-row gap-3 mb-6">
        <div class="flex-1">
          <input [(ngModel)]="searchQuery" type="text" placeholder="Search city or stop name..."
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"/>
        </div>
        <select [(ngModel)]="selectedCity" (ngModelChange)="onCityChange()"
          class="px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white
                 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All cities</option>
          @for (city of cities(); track city.city) {
            <option [value]="city.city">{{ city.city }} ({{ city.stopCount }})</option>
          }
        </select>
      </div>

      <!-- Cities overview -->
      @if (!selectedCity) {
        <div>
          <h2 class="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Cities</h2>
          @if (loadingCities()) {
            <div class="flex justify-center py-12">
              <svg class="animate-spin w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          }
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            @for (city of filteredCities(); track city.city) {
              <button (click)="selectCity(city.city)"
                class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left
                       hover:border-indigo-200 hover:shadow-md transition-all group">
                <div class="text-2xl mb-2">🏙️</div>
                <p class="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors text-sm">
                  {{ city.city }}
                </p>
                <p class="text-xs text-slate-500 mt-0.5">{{ city.stopCount }} stop{{ city.stopCount !== 1 ? 's' : '' }}</p>
              </button>
            }
          </div>
          @if (!loadingCities() && filteredCities().length === 0) {
            <div class="text-center py-12 text-slate-500">
              <p>No cities match "{{ searchQuery }}"</p>
            </div>
          }
        </div>
      }

      <!-- Stops for selected city -->
      @if (selectedCity) {
        <div>
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <button (click)="selectedCity = ''; stops.set([])"
                class="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                All cities
              </button>
              <span class="text-slate-400">/</span>
              <h2 class="font-semibold text-slate-800">{{ selectedCity }}</h2>
            </div>
          </div>

          @if (loadingStops()) {
            <div class="flex justify-center py-12">
              <svg class="animate-spin w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          }

          <div class="space-y-2">
            @for (stop of filteredStops(); track stop.id) {
              <div class="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-slate-700 font-medium text-sm">{{ stop.name }}</span>
                      <span class="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {{ stop.city }}
                      </span>
                    </div>
                    @if (stop.latitude && stop.longitude) {
                      <p class="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        {{ stop.latitude ? stop.latitude.toFixed(4) : '' }}, {{ stop.longitude ? stop.longitude.toFixed(4) : '' }}
                      </p>
                    }
                  </div>
                  <span class="text-xs font-mono text-slate-400">
                    {{ stop.id.slice(0,8) }}
                  </span>
                </div>
              </div>
            }

            @if (!loadingStops() && filteredStops().length === 0) {
              <div class="text-center py-12 text-slate-500">
                <p>No stops found in {{ selectedCity }}</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
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

  filteredCities = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return this.cities().filter(c => c.city.toLowerCase().includes(q));
  });

  filteredStops = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return this.stops().filter(s =>
      s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.stopService.getCities().subscribe({
      next: (data) => { this.cities.set(data); this.loadingCities.set(false); },
      error: () => { this.loadingCities.set(false); this.toast.error('Failed to load cities.'); },
    });
  }

  selectCity(city: string): void {
    this.selectedCity = city;
    this.searchQuery = '';
    this.onCityChange();
  }

  onCityChange(): void {
    if (!this.selectedCity) { this.stops.set([]); return; }
    this.loadingStops.set(true);
    this.stopService.getStopsByCity(this.selectedCity).subscribe({
      next: (data) => { this.stops.set(data); this.loadingStops.set(false); },
      error: () => { this.loadingStops.set(false); this.toast.error('Failed to load stops.'); },
    });
  }
}
