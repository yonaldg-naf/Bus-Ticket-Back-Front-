import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { BusService } from '../../../services/bus-route.service';
import { ScheduleService } from '../../../services/schedule.service';
import { StopService } from '../../../services/stop.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-5xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold text-slate-800 mb-1">Admin Dashboard</h1>
      <p class="text-slate-500 mb-8">System overview — {{ auth.currentUser()?.fullName }}</p>

      <!-- Stats cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        @for (stat of stats(); track stat.label) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-2xl">{{ stat.icon }}</span>
              <span class="text-xs font-medium px-2 py-0.5 rounded-full" [class]="stat.badgeClass">
                live
              </span>
            </div>
            @if (stat.loading) {
              <div class="h-7 bg-slate-100 rounded animate-pulse w-12 mb-1"></div>
            } @else {
              <p class="text-2xl font-bold text-slate-800">{{ stat.value }}</p>
            }
            <p class="text-xs text-slate-500 mt-0.5">{{ stat.label }}</p>
          </div>
        }
      </div>

      <!-- Navigation cards -->
      <h2 class="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">Management</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (card of adminCards; track card.title) {
          <a [routerLink]="card.link"
            class="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5
                   hover:shadow-md hover:border-indigo-100 transition-all">
            <div class="flex items-start gap-4">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                [class]="card.bg">
                {{ card.icon }}
              </div>
              <div>
                <h3 class="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                  {{ card.title }}
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">{{ card.desc }}</p>
              </div>
            </div>
          </a>
        }
      </div>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  auth = inject(AuthService);
  private busService = inject(BusService);
  private scheduleService = inject(ScheduleService);
  private stopService = inject(StopService);

  stats = signal([
    { label: 'Total Buses',     icon: '🚌', value: '—', loading: true, badgeClass: 'bg-indigo-100 text-indigo-700' },
    { label: 'Schedules',       icon: '🗓️', value: '—', loading: true, badgeClass: 'bg-blue-100 text-blue-700'   },
    { label: 'Cities',          icon: '🏙️', value: '—', loading: true, badgeClass: 'bg-green-100 text-green-700' },
    { label: 'Stops',           icon: '📍', value: '—', loading: true, badgeClass: 'bg-amber-100 text-amber-700' },
  ]);

  adminCards = [
    { title: 'Manage Stops',     desc: 'View and manage bus stops across cities', icon: '📍', bg: 'bg-amber-50',  link: '/admin/stops' },
    { title: 'All Buses',        desc: 'View all registered buses in the system',  icon: '🚌', bg: 'bg-indigo-50', link: '/operator/buses' },
    { title: 'All Schedules',    desc: 'View and manage all departure schedules',  icon: '🗓️', bg: 'bg-blue-50',   link: '/operator/schedules' },
    { title: 'All Routes',       desc: 'View all routes across all operators',     icon: '🗺️', bg: 'bg-green-50',  link: '/operator/routes' },
    { title: 'Operator Panel',   desc: 'Switch to operator management view',       icon: '🎛️', bg: 'bg-purple-50', link: '/operator' },
  ];

  ngOnInit(): void {
    // Load buses count
    this.busService.getAll().subscribe({
      next: (data) => this.updateStat(0, data.length.toString()),
      error: () => this.updateStat(0, 'err'),
    });

    // Load schedules count
    this.scheduleService.getAll().subscribe({
      next: (data) => this.updateStat(1, data.length.toString()),
      error: () => this.updateStat(1, 'err'),
    });

    // Load cities + stops count
    this.stopService.getCities().subscribe({
      next: (data) => {
        this.updateStat(2, data.length.toString());
        const totalStops = data.reduce((sum, c) => sum + c.stopCount, 0);
        this.updateStat(3, totalStops.toString());
      },
      error: () => { this.updateStat(2, 'err'); this.updateStat(3, 'err'); },
    });
  }

  private updateStat(index: number, value: string): void {
    this.stats.update(s => s.map((item, i) =>
      i === index ? { ...item, value, loading: false } : item
    ));
  }
}