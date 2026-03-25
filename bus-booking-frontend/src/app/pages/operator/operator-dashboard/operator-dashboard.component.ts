import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { BusService } from '../../../services/bus-route.service';
import { ScheduleService } from '../../../services/schedule.service';
import { RouteService } from '../../../services/bus-route.service';
import { BookingService } from '../../../services/booking.service';

@Component({
  selector: 'app-operator-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-md shadow-red-200">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-base font-bold text-slate-900 dark:text-white">Operator Dashboard</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">Welcome back, <span class="font-semibold text-red-600">{{ auth.currentUser()?.fullName }}</span></p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          @if (auth.currentUser()?.companyName) {
            <div class="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <span class="text-sm">🏢</span>
              <span class="text-xs font-semibold text-red-700 dark:text-red-400">{{ auth.currentUser()?.companyName }}</span>
            </div>
          }
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            {{ auth.currentUser()?.fullName?.[0]?.toUpperCase() }}
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
        @for (s of stats(); track s.label) {
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl" [class]="s.bg">{{ s.icon }}</div>
              <span class="text-xs font-medium px-2 py-0.5 rounded-full" [class]="s.badgeCls">{{ s.badge }}</span>
            </div>
            @if (s.loading) {
              <div class="h-8 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse w-16 mb-1"></div>
            } @else {
              <p class="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{{ s.value }}</p>
            }
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{{ s.label }}</p>
          </div>
        }
      </div>

      <!-- Quick Actions + Tips -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 class="font-bold text-slate-900 dark:text-white">Fleet Management</h2>
            <p class="text-xs text-slate-400 mt-0.5">Manage your buses, routes and schedules</p>
          </div>
          <div class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (card of cards; track card.title) {
              <a [routerLink]="card.link"
                class="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-red-200 hover:bg-red-50/40 dark:hover:bg-red-900/10 transition-all group text-center cursor-pointer">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm transition-transform group-hover:scale-110" [class]="card.bg">{{ card.icon }}</div>
                <div>
                  <h3 class="font-bold text-slate-900 dark:text-white group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors text-sm">{{ card.title }}</h3>
                  <p class="text-xs text-slate-400 mt-0.5 leading-relaxed">{{ card.desc }}</p>
                </div>
                <span class="text-xs font-semibold text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Open <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </span>
              </a>
            }
          </div>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <span class="text-lg">💡</span>
            <h2 class="font-bold text-slate-900 dark:text-white">Quick Tips</h2>
          </div>
          <div class="p-4 space-y-3">
            @for (tip of tips; track tip.text) {
              <div class="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0" [class]="tip.bg">{{ tip.icon }}</div>
                <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{{ tip.text }}</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class OperatorDashboardComponent implements OnInit {
  auth           = inject(AuthService);
  private busSvc     = inject(BusService);
  private schedSvc   = inject(ScheduleService);
  private routeSvc   = inject(RouteService);
  private bookingSvc = inject(BookingService);

  stats = signal([
    { label: 'Total Bookings', icon: '🎫', value: '—', loading: true, bg: 'bg-purple-50 dark:bg-purple-900/20', badge: 'Bookings', badgeCls: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
    { label: 'Confirmed',      icon: '✅', value: '—', loading: true, bg: 'bg-green-50 dark:bg-green-900/20',  badge: 'Paid',     badgeCls: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'   },
    { label: 'Revenue',        icon: '💰', value: '—', loading: true, bg: 'bg-yellow-50 dark:bg-yellow-900/20',badge: 'Earned',   badgeCls: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'},
    { label: 'My Buses',       icon: '🚌', value: '—', loading: true, bg: 'bg-red-50 dark:bg-red-900/20',      badge: 'Fleet',    badgeCls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'           },
    { label: 'My Routes',      icon: '🗺️', value: '—', loading: true, bg: 'bg-slate-100 dark:bg-slate-700',    badge: 'Routes',   badgeCls: 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300'      },
    { label: 'My Schedules',   icon: '🗓️', value: '—', loading: true, bg: 'bg-red-50 dark:bg-red-900/20',      badge: 'Trips',    badgeCls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'          },
  ]);

  cards = [
    { title: 'Manage Buses',       desc: 'Add, edit and manage your fleet',       icon: '🚌', bg: 'bg-red-50',    link: '/operator/buses'         },
    { title: 'Manage Routes',      desc: 'Create and update bus routes',           icon: '🗺️', bg: 'bg-slate-100', link: '/operator/routes'        },
    { title: 'Manage Schedules',   desc: 'Schedule departures and set prices',     icon: '🗓️', bg: 'bg-green-50',  link: '/operator/schedules'     },
    { title: 'Revenue Analytics',  desc: 'Track earnings and performance',         icon: '📊', bg: 'bg-yellow-50', link: '/operator/analytics'     },
    { title: 'Promo Codes',        desc: 'Create discount codes for customers',    icon: '🏷️', bg: 'bg-purple-50', link: '/operator/promo-codes'   },
    { title: 'Announcements',      desc: 'Post trip notices to passengers',        icon: '📢', bg: 'bg-red-50',    link: '/operator/announcements' },
    { title: 'Passenger Manifest', desc: 'View and print passenger list per trip', icon: '👥', bg: 'bg-slate-100', link: '/operator/manifest'      },
  ];

  tips = [
    { icon: '✅', bg: 'bg-green-50',  text: 'Set bus status to Available to allow customer bookings.' },
    { icon: '🕐', bg: 'bg-slate-100', text: 'Keep schedules updated with correct departure times.'    },
    { icon: '🔧', bg: 'bg-red-50',    text: 'Mark buses as Under Repair if temporarily unavailable.'  },
    { icon: '💰', bg: 'bg-yellow-50', text: 'Competitive pricing increases your booking rate.'         },
  ];

  ngOnInit() {
    this.busSvc.getAll().subscribe({ next: d => this.update(3, String(d.length)), error: () => this.update(3, '—') });
    this.routeSvc.getAll().subscribe({ next: d => this.update(4, String(d.length)), error: () => this.update(4, '—') });
    this.schedSvc.getAll().subscribe({ next: d => this.update(5, String(d.length)), error: () => this.update(5, '—') });
    this.bookingSvc.getOperatorStats().subscribe({
      next: s => {
        this.update(0, String(s.totalBookings));
        this.update(1, String(s.confirmedBookings));
        this.update(2, 'Rs' + s.revenue.toLocaleString('en-IN'));
      },
      error: () => { this.update(0, '—'); this.update(1, '—'); this.update(2, '—'); },
    });
  }

  private update(i: number, value: string) {
    this.stats.update(s => s.map((item, idx) => idx === i ? { ...item, value, loading: false } : item));
  }
}