// ─── Operator Dashboard — Theme #3 (Minimal White + Jet Black + Purple Accent) ───
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-operator-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="container max-w-5xl pt-10">

      <!-- Heading -->
      <div class="mb-6">
        <h1 class="text-3xl font-extrabold tracking-tight">Operator Panel</h1>
        <p class="text-muted">
          Welcome back, {{ auth.currentUser()?.fullName }}
        </p>
      </div>

      <!-- Core action cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">

        @for (card of cards; track card.title) {
          <a
            [routerLink]="card.link"
            class="card hover:card-soft transition cursor-pointer"
          >
            <div class="card-body">
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl"
                [class]="card.bg"
              >
                {{ card.icon }}
              </div>

              <h3 class="font-semibold text-lg">
                {{ card.title }}
              </h3>

              <p class="text-sm text-muted mt-1">
                {{ card.desc }}
              </p>
            </div>
          </a>
        }

      </div>

      <!-- Extra tips card -->
      <div class="card mt-8">
        <div class="card-body">
          <h3 class="font-semibold mb-2">Tips</h3>

          <ul class="list-disc pl-5 text-sm text-muted space-y-1">
            <li>
              Set bus status to <span class="font-medium">Available</span> to allow customer bookings.
            </li>
            <li>
              Keep schedules updated with correct <span class="font-medium">departure time</span>.
            </li>
            <li>
              Mark buses as <span class="font-medium">Under Repair</span> if unavailable temporarily.
            </li>
          </ul>
        </div>
      </div>
    </section>
  `,
})
export class OperatorDashboardComponent {
  auth = inject(AuthService);

  // Fully themed card definitions (same logic, themed UI)
  cards = [
    {
      title: 'Manage Buses',
      desc: 'Add, edit and manage your fleet',
      icon: '🚌',
      bg: 'bg-[#F3F2FF]', // soft purple tint
      link: '/operator/buses',
    },
    {
      title: 'Manage Routes',
      desc: 'Create and update bus routes',
      icon: '🗺️',
      bg: 'bg-[#EEF6FF]', // soft blue tint
      link: '/operator/routes',
    },
    {
      title: 'Manage Schedules',
      desc: 'Schedule departures and set prices',
      icon: '🗓️',
      bg: 'bg-[#EFFFF5]', // soft green tint
      link: '/operator/schedules',
    },
  ];
}
