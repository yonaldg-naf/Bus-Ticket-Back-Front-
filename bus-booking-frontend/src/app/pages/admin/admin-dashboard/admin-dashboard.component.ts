import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { AuditLogService, AuditLogEntry } from '../../../services/audit-log.service';
import { BusService, RouteService } from '../../../services/bus-route.service';
import { ScheduleService } from '../../../services/schedule.service';
import { UserManagementService } from '../../../services/user-management.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <!-- Top Header Bar -->
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-md shadow-red-200">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
          </div>
          <div>
            <h1 class="text-base font-bold text-slate-900 dark:text-white">Admin Control Panel</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">SwiftRoute Platform Management</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span class="text-xs text-green-700 font-medium">Systems Online</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {{ auth.currentUser()?.fullName?.[0]?.toUpperCase() }}
            </div>
            <div class="hidden sm:block">
              <p class="text-xs font-semibold text-slate-800 dark:text-white">{{ auth.currentUser()?.fullName }}</p>
              <p class="text-xs text-slate-400 dark:text-slate-500">Administrator</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      <!-- KPI Stats Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        @for (s of stats(); track s.label) {
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div class="flex items-center justify-between mb-4">
              <div class="w-11 h-11 rounded-xl flex items-center justify-center" [class]="s.iconBg">
                <span class="text-xl">{{ s.icon }}</span>
              </div>
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

      <!-- Main Grid -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <!-- Left: Management Modules (2/3 width) -->
        <div class="xl:col-span-2 space-y-6">

          <!-- Quick Actions -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h2 class="font-bold text-slate-900 dark:text-white">Management Modules</h2>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Access all platform controls</p>
              </div>
            </div>
            <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              @for (card of adminCards; track card.title) {
                <a [routerLink]="card.link"
                  class="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/40 dark:hover:bg-red-900/10 transition-all group cursor-pointer">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm transition-transform group-hover:scale-110" [class]="card.bg">
                    {{ card.icon }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <h3 class="font-semibold text-sm text-slate-800 dark:text-white group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">{{ card.title }}</h3>
                      @if (card.badge) {
                        <span class="px-1.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700">{{ card.badge }}</span>
                      }
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{{ card.desc }}</p>
                  </div>
                  <svg class="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-red-400 flex-shrink-0 transition-all group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </a>
              }
            </div>
          </div>

          <!-- Platform Health -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 class="font-bold text-slate-900 dark:text-white">Platform Health</h2>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Real-time system status</p>
            </div>
            <div class="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              @for (h of healthItems; track h.label) {
                <div class="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                  <div class="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" [class]="h.bg">{{ h.icon }}</div>
                  <div>
                    <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ h.label }}</p>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <span class="w-1.5 h-1.5 rounded-full" [class]="h.dot"></span>
                      <span class="text-xs" [class]="h.textCls">{{ h.status }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

        </div>

        <!-- Right: Activity Feed (1/3 width) -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 class="font-bold text-slate-900 dark:text-white">Recent Activity</h2>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Latest system events</p>
            </div>
            <a routerLink="/admin/audit-logs"
              class="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors">
              View all
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </a>
          </div>

          <div class="flex-1 overflow-auto divide-y divide-slate-50 dark:divide-slate-700">
            @if (logsLoading()) {
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="px-5 py-3.5 flex gap-3 items-center">
                  <div class="w-8 h-8 rounded-full bg-slate-100 animate-pulse flex-shrink-0"></div>
                  <div class="flex-1 space-y-1.5">
                    <div class="h-3 bg-slate-100 animate-pulse rounded w-3/4"></div>
                    <div class="h-2.5 bg-slate-100 animate-pulse rounded w-1/2"></div>
                  </div>
                </div>
              }
            } @else if (recentLogs().length === 0) {
              <div class="flex flex-col items-center justify-center py-12 text-slate-300">
                <span class="text-4xl mb-2">📭</span>
                <p class="text-sm font-medium text-slate-400">No recent activity</p>
              </div>
            } @else {
              @for (log of recentLogs(); track log.id) {
                <div class="px-5 py-3.5 flex gap-3 items-start hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 shadow-sm"
                    [class]="log.isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                    {{ log.isSuccess ? '✓' : '!' }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed">{{ log.description }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs text-slate-400 dark:text-slate-500">{{ log.username ?? 'System' }}</span>
                      <span class="text-slate-300 dark:text-slate-600">·</span>
                      <span class="text-xs text-slate-400 dark:text-slate-500">{{ formatRelative(log.createdAtUtc) }}</span>
                    </div>
                  </div>
                </div>
              }
            }
          </div>

          <div class="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-700/30">
            <a routerLink="/admin/audit-logs"
              class="w-full flex items-center justify-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors py-1">
              Open Full Audit Log →
            </a>
          </div>
        </div>

      </div>
    </div>
  </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  auth = inject(AuthService);
  private auditSvc = inject(AuditLogService);
  private busSvc = inject(BusService);
  private routeSvc = inject(RouteService);
  private scheduleSvc = inject(ScheduleService);
  private userSvc = inject(UserManagementService);

  logsLoading  = signal(true);
  recentLogs   = signal<AuditLogEntry[]>([]);

  stats = signal([
    { label: 'Total Buses',     icon: '🚌', value: '—', loading: false, iconBg: 'bg-red-50',    badge: 'Fleet',    badgeCls: 'bg-red-100 text-red-600'    },
    { label: 'Schedules',       icon: '🗓️', value: '—', loading: false, iconBg: 'bg-blue-50',   badge: 'Active',   badgeCls: 'bg-blue-100 text-blue-600'   },
    { label: 'Routes',          icon: '🗺️', value: '—', loading: false, iconBg: 'bg-teal-50',   badge: 'Network',  badgeCls: 'bg-teal-100 text-teal-600'   },
    { label: 'Total Users',     icon: '👥', value: '—', loading: false, iconBg: 'bg-purple-50', badge: 'Users',    badgeCls: 'bg-purple-100 text-purple-600'},
  ]);

  adminCards = [
    { title: 'Manage Users',   desc: 'View and manage all user accounts',         icon: '👥', bg: 'bg-blue-50',   link: '/admin/manage-users', badge: '' },
    { title: 'Manage Stops',   desc: 'Add and edit bus stops & cities',           icon: '📍', bg: 'bg-orange-50', link: '/admin/stops',        badge: '' },
    { title: 'Manage Buses',   desc: 'Create and manage the bus fleet',           icon: '🚌', bg: 'bg-red-50',    link: '/admin/buses',        badge: '' },
    { title: 'Manage Routes',  desc: 'Create and manage routes',                  icon: '🗺️', bg: 'bg-teal-50',   link: '/admin/routes',       badge: '' },
    { title: 'Schedules',      desc: 'Manage all departure schedules',            icon: '🗓️', bg: 'bg-indigo-50', link: '/admin/schedules',    badge: '' },
    { title: 'Audit Logs',     desc: 'Full system activity & error trail',        icon: '📋', bg: 'bg-slate-100', link: '/admin/audit-logs',   badge: '' },
  ];

  healthItems = [
    { icon: '🟢', label: 'API Server',      status: 'Operational', dot: 'bg-green-500', textCls: 'text-green-600 font-medium', bg: 'bg-green-50'  },
    { icon: '🟢', label: 'Database',        status: 'Healthy',     dot: 'bg-green-500', textCls: 'text-green-600 font-medium', bg: 'bg-green-50'  },
    { icon: '🟢', label: 'Booking Engine',  status: 'Running',     dot: 'bg-green-500', textCls: 'text-green-600 font-medium', bg: 'bg-green-50'  },
  ];

  ngOnInit() {
    forkJoin({
      buses:     this.busSvc.getAll(),
      schedules: this.scheduleSvc.getAll(),
      routes:    this.routeSvc.getAll(),
      users:     this.userSvc.getUsers({ pageSize: 1 }),
    }).subscribe({
      next: ({ buses, schedules, routes, users }) => {
        this.stats.update(s => s.map(stat => {
          if (stat.label === 'Total Buses')  return { ...stat, value: String(buses.length) };
          if (stat.label === 'Schedules')    return { ...stat, value: String(schedules.length) };
          if (stat.label === 'Routes')       return { ...stat, value: String(routes.length) };
          if (stat.label === 'Total Users')  return { ...stat, value: String(users.total) };
          return stat;
        }));
      },
    });

    this.auditSvc.getLogs({ pageSize: 8 }).subscribe({
      next: result => {
        this.recentLogs.set(result.items);
        this.logsLoading.set(false);
      },
      error: () => this.logsLoading.set(false),
    });
  }

  formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }
}
