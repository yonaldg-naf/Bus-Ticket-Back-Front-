// ─── Operator Dashboard — Full-page Red + Black Theme ───
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-operator-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#0f0f10] text-white flex justify-center px-4 py-10">

      <!-- Main content container -->
      <section class="w-full max-w-5xl">

        <!-- Heading -->
        <div class="mb-6 text-center sm:text-left">
          <h1 class="text-3xl font-extrabold tracking-tight">Operator Panel</h1>
          <p class="text-gray-400 mt-1">
            Welcome back, {{ auth.currentUser()?.fullName }}
          </p>
        </div>

        <!-- Core action cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
          @for (card of cards; track card.title) {
            <a
              [routerLink]="card.link"
              class="card hover:shadow-xl transition cursor-pointer border border-gray-700 bg-[#161618]"
            >
              <div class="card-body text-center">
                <div
                  class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl"
                  [ngClass]="card.bg"
                >
                  {{ card.icon }}
                </div>

                <h3 class="font-semibold text-lg text-white">
                  {{ card.title }}
                </h3>

                <p class="text-sm text-gray-400 mt-1">
                  {{ card.desc }}
                </p>
              </div>
            </a>
          }
        </div>

        <!-- Tips card -->
        <div class="card mt-8 border border-gray-700 bg-[#161618]">
          <div class="card-body">
            <h3 class="font-semibold mb-2 text-white">Tips</h3>

            <ul class="list-disc pl-5 text-sm text-gray-400 space-y-1">
              <li>
                Set bus status to <span class="font-medium text-red-500">Available</span> to allow customer bookings.
              </li>
              <li>
                Keep schedules updated with correct <span class="font-medium text-red-500">departure time</span>.
              </li>
              <li>
                Mark buses as <span class="font-medium text-red-500">Under Repair</span> if unavailable temporarily.
              </li>
            </ul>
          </div>
        </div>

      </section>
    </div>
  `,
})
export class OperatorDashboardComponent {
  auth = inject(AuthService);

  cards = [
    { title: 'Manage Buses', desc: 'Add, edit and manage your fleet', icon: '🚌', bg: 'bg-red-600', link: '/operator/buses' },
    { title: 'Manage Routes', desc: 'Create and update bus routes', icon: '🗺️', bg: 'bg-red-500', link: '/operator/routes' },
    { title: 'Manage Schedules', desc: 'Schedule departures and set prices', icon: '🗓️', bg: 'bg-red-400', link: '/operator/schedules' },
  ];
}