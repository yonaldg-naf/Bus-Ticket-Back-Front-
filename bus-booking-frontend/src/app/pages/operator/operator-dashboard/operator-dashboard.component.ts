import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { BusService } from '../../../services/bus-route.service';
import { ScheduleService } from '../../../services/schedule.service';
import { RouteService } from '../../../services/bus-route.service';

@Component({
  selector: 'app-operator-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="min-h-screen bg-gray-50">

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white text-xl shadow-sm">🚌</div>
          <div>
            <h1 class="text-lg font-bold text-gray-900">Operator Panel</h1>
            <p class="text-sm text-gray-500">Welcome, <span class="font-semibold text-red-600">{{ auth.currentUser()?.fullName }}</span></p>
          </div>
        </div>
        @if (auth.currentUser()?.companyName) {
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200">
            🏢 {{ auth.currentUser()?.companyName }}
          </span>
        }
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        @for (s of stats(); track s.label) {
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div class="flex items-start justify-between mb-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl" [class]="s.bg">{{ s.icon }}</div>
              <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Live</span>
            </div>
            @if (s.loading) {
              <div class="h-8 bg-gray-100 rounded-lg animate-pulse w-14 mb-1"></div>
            } @else {
              <p class="text-3xl font-bold text-gray-900">{{ s.value }}</p>
            }
            <p class="text-sm text-gray-500 mt-0.5">{{ s.label }}</p>
          </div>
        }
      </div>

      <!-- Quick Actions -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div class="px-5 py-4 border-b border-gray-100">
          <h2 class="font-semibold text-gray-800">Quick Actions</h2>
          <p class="text-xs text-gray-400 mt-0.5">Manage your fleet, routes and schedules</p>
        </div>
        <div class="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          @for (card of cards; track card.title) {
            <a [routerLink]="card.link"
              class="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-100
                     hover:border-red-200 hover:bg-red-50/30 transition-all group text-center">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm" [class]="card.bg">
                {{ card.icon }}
              </div>
              <div>
                <h3 class="font-bold text-gray-900 group-hover:text-red-700 transition-colors">{{ card.title }}</h3>
                <p class="text-xs text-gray-400 mt-0.5">{{ card.desc }}</p>
              </div>
              <span class="text-xs font-semibold text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Open →
              </span>
            </a>
          }
        </div>
      </div>

      <!-- Tips -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span class="text-yellow-500">💡</span> Operator Tips
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          @for (tip of tips; track tip.text) {
            <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span class="text-lg flex-shrink-0">{{ tip.icon }}</span>
              <p class="text-sm text-gray-600">{{ tip.text }}</p>
            </div>
          }
        </div>
      </div>

    </div>
  </div>
  `,
})
export class OperatorDashboardComponent implements OnInit {
  auth         = inject(AuthService);
  private busSvc   = inject(BusService);
  private schedSvc = inject(ScheduleService);
  private routeSvc = inject(RouteService);

  stats = signal([
    { label: 'Total Bookings', icon: '🎫', value: '—', loading: true, bg: 'bg-purple-50' },
    { label: 'Confirmed',      icon: '✅', value: '—', loading: true, bg: 'bg-green-50'  },
    { label: 'Revenue',        icon: '💰', value: '—', loading: true, bg: 'bg-yellow-50' },
    { label: 'My Buses',       icon: '🚌', value: '—', loading: true, bg: 'bg-red-50'    },
    { label: 'My Routes',      icon: '🗺️', value: '—', loading: true, bg: 'bg-blue-50'   },
    { label: 'My Schedules',   icon: '🗓️', value: '—', loading: true, bg: 'bg-orange-50' },
  ]);

  cards = [
    { title: 'Manage Buses',     desc: 'Add, edit and manage your fleet',    icon: '🚌', bg: 'bg-red-50',   link: '/operator/buses'     },
    { title: 'Manage Routes',    desc: 'Create and update bus routes',        icon: '🗺️', bg: 'bg-blue-50',  link: '/operator/routes'    },
    { title: 'Manage Schedules', desc: 'Schedule departures and set prices',  icon: '🗓️', bg: 'bg-green-50', link: '/operator/schedules' },
  ];

  tips = [
    { icon: '✅', text: 'Set bus status to Available to allow customer bookings.' },
    { icon: '🕐', text: 'Keep schedules updated with correct departure times.'    },
    { icon: '🔧', text: 'Mark buses as Under Repair if temporarily unavailable.'  },
  ];

  ngOnInit() {
    this.busSvc.getAll().subscribe({ next: d => this.update(0, String(d.length)), error: () => this.update(0, 'err') });
    this.routeSvc.getAll().subscribe({ next: d => this.update(1, String(d.length)), error: () => this.update(1, 'err') });
    this.schedSvc.getAll().subscribe({ next: d => this.update(2, String(d.length)), error: () => this.update(2, 'err') });
  }

  private update(i: number, value: string) {
    this.stats.update(s => s.map((item, idx) => idx === i ? { ...item, value, loading: false } : item));
  }
}