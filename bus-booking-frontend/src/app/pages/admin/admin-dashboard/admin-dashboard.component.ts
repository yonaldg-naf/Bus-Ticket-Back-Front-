import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { BusService } from '../../../services/bus-route.service';
import { ScheduleService } from '../../../services/schedule.service';
import { StopService } from '../../../services/stop.service';
import { AuditLogService, AuditLogEntry } from '../../../services/audit-log.service';
import { OperatorApprovalService } from '../../../services/operator-approval.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-5 shadow-sm">
        <div class="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white text-xl shadow">🛡️</div>
            <div>
              <h1 class="text-lg font-bold text-gray-900">Admin Control Panel</h1>
              <p class="text-sm text-gray-500">Welcome back, <span class="font-semibold text-red-600">{{ auth.currentUser()?.fullName }}</span></p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span class="text-xs text-gray-500 font-medium">All systems operational</span>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <!-- KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Management Cards -->
          <div class="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div class="px-5 py-4 border-b border-gray-100">
              <h2 class="font-semibold text-gray-800">Management Modules</h2>
            </div>
            <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              @for (card of adminCards; track card.title) {
                <a [routerLink]="card.link"
                  class="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50/30 transition-all group">
                  <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" [class]="card.bg">{{ card.icon }}</div>
                  <div class="min-w-0">
                    <h3 class="font-semibold text-sm text-gray-800 group-hover:text-red-700 transition-colors">{{ card.title }}</h3>
                    <p class="text-xs text-gray-400 mt-0.5">{{ card.desc }}</p>
                  </div>
                  <svg class="w-4 h-4 text-gray-300 group-hover:text-red-400 ml-auto flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </a>
              }
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 class="font-semibold text-gray-800">Recent Activity</h2>
              <a routerLink="/admin/audit-logs" class="text-xs text-red-600 font-medium hover:underline">View all →</a>
            </div>
            <div class="flex-1 divide-y divide-gray-50 overflow-auto">
              @if (logsLoading()) {
                @for (i of [1,2,3,4,5]; track i) {
                  <div class="px-5 py-3 flex gap-3 items-center">
                    <div class="w-7 h-7 rounded-full bg-gray-100 animate-pulse flex-shrink-0"></div>
                    <div class="flex-1 space-y-1.5">
                      <div class="h-3 bg-gray-100 animate-pulse rounded w-3/4"></div>
                      <div class="h-3 bg-gray-100 animate-pulse rounded w-1/2"></div>
                    </div>
                  </div>
                }
              } @else if (recentLogs().length === 0) {
                <div class="flex flex-col items-center justify-center py-10 text-gray-300">
                  <span class="text-3xl mb-1">📭</span>
                  <p class="text-sm">No recent activity</p>
                </div>
              } @else {
                @for (log of recentLogs(); track log.id) {
                  <div class="px-5 py-3 flex gap-3 items-start hover:bg-gray-50 transition-colors">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
                      [class]="log.logType === 'Error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'">
                      {{ log.logType === 'Error' ? '!' : (log.username ?? 'S')[0].toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-gray-700 truncate">{{ log.description }}</p>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-xs text-gray-400">{{ log.username ?? 'System' }}</span>
                        <span class="text-gray-300">·</span>
                        <span class="text-xs text-gray-400">{{ formatRelative(log.createdAtUtc) }}</span>
                        <span class="w-1.5 h-1.5 rounded-full" [class]="log.isSuccess ? 'bg-green-400' : 'bg-red-400'"></span>
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
            <div class="px-5 py-3 border-t border-gray-100">
              <a routerLink="/admin/audit-logs"
                class="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
                View Full Audit Log →
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
  private busSvc = inject(BusService);
  private schedSvc = inject(ScheduleService);
  private stopSvc = inject(StopService);
  private auditSvc    = inject(AuditLogService);
  private approvalSvc = inject(OperatorApprovalService);

  logsLoading   = signal(true);
  pendingCount  = signal(0);
  recentLogs = signal<AuditLogEntry[]>([]);

  stats = signal([
    { label: 'Total Buses',  icon: '🚌', value: '—', loading: true, bg: 'bg-red-50' },
    { label: 'Schedules',    icon: '🗓️', value: '—', loading: true, bg: 'bg-blue-50' },
    { label: 'Cities',       icon: '🏙️', value: '—', loading: true, bg: 'bg-purple-50' },
    { label: 'Stops',        icon: '📍', value: '—', loading: true, bg: 'bg-orange-50' },
  ]);

  adminCards = [
    { title: 'Manage Stops',  desc: 'Add & manage bus stops',          icon: '📍', bg: 'bg-orange-50', link: '/admin/stops' },
    { title: 'Audit Logs',    desc: 'System activity & error logs',    icon: '📋', bg: 'bg-gray-100',  link: '/admin/audit-logs' },
    { title: 'Operator Approvals', desc: 'Review pending operator requests', icon: '🚌', bg: 'bg-orange-50', link: '/admin/operator-approvals' },
    { title: 'All Buses',     desc: 'View all registered buses',       icon: '🚌', bg: 'bg-red-50',   link: '/operator/buses' },
    { title: 'All Schedules', desc: 'Manage all departure schedules',  icon: '🗓️', bg: 'bg-blue-50',  link: '/operator/schedules' },
    { title: 'All Routes',    desc: 'View routes across operators',    icon: '🗺️', bg: 'bg-green-50', link: '/operator/routes' },
    { title: 'Operator Panel',desc: 'Switch to operator view',         icon: '🎛️', bg: 'bg-purple-50',link: '/operator' },
  ];

  ngOnInit() {
    this.busSvc.getAll().subscribe({ next: d => this.updateStat(0, d.length.toString()), error: () => this.updateStat(0, 'err') });
    this.schedSvc.getAll().subscribe({ next: d => this.updateStat(1, d.length.toString()), error: () => this.updateStat(1, 'err') });
    this.stopSvc.getCities().subscribe({
      next: d => { this.updateStat(2, d.length.toString()); this.updateStat(3, d.reduce((s: number, c: any) => s + c.stopCount, 0).toString()); },
      error: () => { this.updateStat(2, 'err'); this.updateStat(3, 'err'); }
    });
    this.approvalSvc.getPending().subscribe({
      next: d => this.pendingCount.set(d.length),
      error: () => {},
    });
    this.auditSvc.getLogs({ logType: 'Audit', pageSize: 5, page: 1 }).subscribe({
      next: r => { this.recentLogs.set(r.items); this.logsLoading.set(false); },
      error: () => this.logsLoading.set(false),
    });
  }

  private updateStat(i: number, value: string) {
    this.stats.update(s => s.map((item, idx) => idx === i ? { ...item, value, loading: false } : item));
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