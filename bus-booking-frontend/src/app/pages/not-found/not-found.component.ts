import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="text-center max-w-md">
      <!-- Bus icon -->
      <div class="w-24 h-24 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-5xl">🚌</div>
      <!-- 404 number -->
      <h1 class="text-8xl font-black text-gray-200 mb-2 select-none leading-none">404</h1>
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Page not found</h2>
      <p class="text-gray-500 mb-8">Looks like this bus took a wrong turn. The page you're looking for doesn't exist.</p>
      <a routerLink="/home"
        class="btn-primary inline-flex items-center gap-2 px-6 py-3">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
        Back to Home
      </a>
    </div>
  </div>
  `,
})
export class NotFoundComponent {}