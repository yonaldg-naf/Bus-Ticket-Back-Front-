import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FavoritesService } from '../../services/favorites.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <a routerLink="/home" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-500 dark:text-slate-300 hover:text-red-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <div>
          <h1 class="text-base font-bold text-slate-900 dark:text-white">Favourite Routes</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400">Your saved routes for quick booking</p>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">

      @if (favSvc.favorites().length === 0) {
        <div class="text-center py-20">
          <div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">❤️</div>
          <h2 class="text-lg font-bold text-slate-800 dark:text-white">No favourites yet</h2>
          <p class="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xs mx-auto">
            Search for a route and tap the heart icon to save it here for quick access.
          </p>
          <a routerLink="/home" class="inline-block mt-5 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-red-200">
            Search Routes
          </a>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (fav of favSvc.favorites(); track fav.id) {
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 hover:shadow-md hover:border-red-100 dark:hover:border-red-900/30 transition-all">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                    <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                  <span class="text-xs text-slate-400 dark:text-slate-500">Saved {{ formatDate(fav.addedAt) }}</span>
                </div>
                <button (click)="favSvc.remove(fav.id)"
                  class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Remove from favourites">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div class="flex items-center gap-3 mb-4">
                <div class="flex-1 text-center">
                  <p class="text-xs text-slate-400 uppercase tracking-wide mb-0.5">From</p>
                  <p class="font-bold text-slate-900 dark:text-white text-base">{{ fav.fromCity }}</p>
                </div>
                <div class="flex flex-col items-center gap-1">
                  <div class="w-8 h-0.5 bg-slate-200 dark:bg-slate-600 rounded"></div>
                  <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                  </svg>
                  <div class="w-8 h-0.5 bg-slate-200 dark:bg-slate-600 rounded"></div>
                </div>
                <div class="flex-1 text-center">
                  <p class="text-xs text-slate-400 uppercase tracking-wide mb-0.5">To</p>
                  <p class="font-bold text-slate-900 dark:text-white text-base">{{ fav.toCity }}</p>
                </div>
              </div>

              <button (click)="searchRoute(fav)"
                class="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm shadow-red-200 flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                Search Buses
              </button>
            </div>
          }
        </div>
      }
    </div>
  </div>
  `,
})
export class FavoritesComponent {
  favSvc = inject(FavoritesService);
  private router = inject(Router);

  searchRoute(fav: { fromCity: string; toCity: string }) {
    const today = new Date().toISOString().split('T')[0];
    this.router.navigate(['/search'], { queryParams: { from: fav.fromCity, to: fav.toCity, date: today } });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}
