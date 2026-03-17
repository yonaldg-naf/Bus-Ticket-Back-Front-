import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div class="text-center">
        <div class="text-8xl font-black text-indigo-100 mb-4 select-none">404</div>
        <h1 class="text-2xl font-bold text-slate-800 mb-2">Page not found</h1>
        <p class="text-slate-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <a routerLink="/home"
          class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl
                 font-semibold text-sm hover:bg-indigo-700 transition-colors">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          Back to Home
        </a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}