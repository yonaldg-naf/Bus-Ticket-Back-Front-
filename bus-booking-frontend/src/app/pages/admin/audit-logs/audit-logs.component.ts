import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuditLogService, AuditLogEntry, PagedAuditLogResult, AuditLogQuery } from '../../../services/audit-log.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="min-h-screen bg-slate-50">

    <!-- Top Bar -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <a routerLink="/admin" class="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 class="text-xl font-semibold text-slate-900">Audit & Error Logs</h1>
            <p class="text-sm text-slate-500 mt-0.5">System activity trail — admin access only</p>
          </div>
        </div>
        <button (click)="loadLogs()"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
          <svg class="w-4 h-4" [class.animate-spin]="loading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-6 py-6 space-y-5">

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        @for (s of summaryCards(); track s.label) {
          <div class="bg-white rounded-xl border border-slate-200 p-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center" [class]="s.bg">
                <svg class="w-5 h-5" [class]="s.iconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="s.iconPath"/>
                </svg>
              </div>
              <div>
                <p class="text-2xl font-bold text-slate-900">{{ s.value }}</p>
                <p class="text-xs text-slate-500">{{ s.label }}</p>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Main Table Card -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">

        <!-- Tab Bar -->
        <div class="flex border-b border-slate-200 bg-slate-50/50">
          @for (tab of tabs; track tab.id) {
            <button (click)="setTab(tab.id)"
              class="px-5 py-3.5 text-sm font-medium transition-colors relative whitespace-nowrap"
              [class]="activeTab() === tab.id
                ? 'text-red-600 bg-white border-b-2 border-red-600 -mb-px'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'">
              {{ tab.label }}
              @if (tab.count !== undefined) {
                <span class="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                  [class]="activeTab() === tab.id ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'">
                  {{ tab.count }}
                </span>
              }
            </button>
          }
        </div>

        <!-- Filters -->
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/40">
          <div class="flex flex-wrap gap-3 items-end">
            <div class="flex-1 min-w-[140px]">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Username</label>
              <input [(ngModel)]="filters.username" (keyup.enter)="applyFilters()"
                placeholder="Search user…"
                class="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
            </div>
            <div class="min-w-[130px]">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Entity</label>
              <select [(ngModel)]="filters.entityType" (change)="applyFilters()"
                class="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors">
                <option value="">All entities</option>
                @for (e of entityTypes; track e) { <option [value]="e">{{ e }}</option> }
              </select>
            </div>
            <div class="min-w-[120px]">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</label>
              <select [(ngModel)]="filters.isSuccess" (change)="applyFilters()"
                class="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors">
                <option [ngValue]="undefined">All</option>
                <option [ngValue]="true">Success</option>
                <option [ngValue]="false">Failed</option>
              </select>
            </div>
            <div class="min-w-[140px]">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">From</label>
              <input type="date" [(ngModel)]="filters.from" (change)="applyFilters()"
                class="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors"/>
            </div>
            <div class="min-w-[140px]">
              <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">To</label>
              <input type="date" [(ngModel)]="filters.to" (change)="applyFilters()"
                class="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors"/>
            </div>
            <div class="flex gap-2">
              <button (click)="clearFilters()"
                class="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                Clear
              </button>
              <button (click)="applyFilters()"
                class="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Apply
              </button>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          @if (loading()) {
            <div class="flex items-center justify-center py-20 gap-3 text-slate-400">
              <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Loading logs…
            </div>
          } @else if (logs().length === 0) {
            <div class="flex flex-col items-center justify-center py-20 text-slate-400">
              <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <p class="font-semibold text-slate-500">No logs found</p>
              <p class="text-sm mt-1">Try adjusting your filters</p>
            </div>
          } @else {
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-left">
                  <th class="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                  <th class="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th class="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                  <th class="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  <th class="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Entity</th>
                  <th class="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th class="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ms</th>
                  <th class="px-5 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (log of logs(); track log.id) {
                  <tr (click)="toggleDetail(log.id)"
                    class="transition-colors cursor-pointer"
                    [class]="!log.isSuccess && expandedId() !== log.id ? 'bg-red-50/50 hover:bg-red-50'
                           : !log.isSuccess && expandedId() === log.id ? 'bg-red-50'
                           : log.isSuccess && expandedId() === log.id ? 'bg-blue-50/50'
                           : 'hover:bg-slate-50/60'">

                    <td class="px-5 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                      {{ formatTime(log.createdAtUtc) }}
                    </td>

                    <td class="px-5 py-3 whitespace-nowrap">
                      <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                        [class]="log.logType === 'Error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'">
                        <span class="w-1.5 h-1.5 rounded-full" [class]="log.logType === 'Error' ? 'bg-red-500' : 'bg-blue-500'"></span>
                        {{ log.logType }}
                      </span>
                    </td>

                    <td class="px-5 py-3 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                          {{ (log.username ?? 'S')[0].toUpperCase() }}
                        </div>
                        <div>
                          <p class="text-xs font-medium text-slate-800">{{ log.username ?? 'System' }}</p>
                          @if (log.userRole) { <p class="text-xs text-slate-400">{{ log.userRole }}</p> }
                        </div>
                      </div>
                    </td>

                    <td class="px-5 py-3 text-slate-700 max-w-xs">
                      <span class="line-clamp-1" [title]="log.description">{{ log.description }}</span>
                    </td>

                    <td class="px-5 py-3 whitespace-nowrap">
                      @if (log.entityType) {
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {{ log.entityType }}
                        </span>
                      } @else { <span class="text-slate-300 text-xs">—</span> }
                    </td>

                    <td class="px-5 py-3 whitespace-nowrap">
                      <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full flex-shrink-0" [class]="log.isSuccess ? 'bg-emerald-500' : 'bg-red-500'"></span>
                        @if (log.statusCode) {
                          <span class="text-xs font-mono" [class]="(log.statusCode ?? 0) >= 400 ? 'text-red-600 font-semibold' : 'text-slate-600'">
                            {{ log.statusCode }}
                          </span>
                        }
                      </div>
                    </td>

                    <td class="px-5 py-3 whitespace-nowrap text-xs text-slate-500 font-mono">
                      {{ log.durationMs != null ? log.durationMs + 'ms' : '—' }}
                    </td>

                    <td class="px-5 py-3">
                      <svg class="w-4 h-4 text-slate-400 transition-transform duration-200"
                        [class.rotate-180]="expandedId() === log.id"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </td>
                  </tr>

                  @if (expandedId() === log.id) {
                    <tr class="border-b border-slate-200">
                      <td colspan="8" class="px-6 py-4 bg-slate-50">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div class="space-y-2">
                            <p class="font-semibold text-slate-600 uppercase tracking-wide text-xs">Request Details</p>
                            <div class="space-y-1 text-slate-700">
                              <p><span class="text-slate-400 w-20 inline-block">Method:</span><span class="font-mono font-semibold">{{ log.httpMethod ?? '—' }}</span></p>
                              <p><span class="text-slate-400 w-20 inline-block">Endpoint:</span><span class="font-mono break-all">{{ log.endpoint ?? '—' }}</span></p>
                              <p><span class="text-slate-400 w-20 inline-block">Entity ID:</span><span class="font-mono">{{ log.entityId ?? '—' }}</span></p>
                              <p><span class="text-slate-400 w-20 inline-block">Log ID:</span><span class="font-mono text-slate-400">{{ log.id }}</span></p>
                            </div>
                          </div>
                          @if (log.detail) {
                            <div class="space-y-2">
                              <p class="font-semibold text-red-600 uppercase tracking-wide text-xs">Stack Trace</p>
                              <pre class="bg-red-50 border border-red-100 rounded-lg p-3 text-red-800 text-xs overflow-x-auto max-h-44 whitespace-pre-wrap leading-relaxed">{{ log.detail }}</pre>
                            </div>
                          }
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          }
        </div>

        <!-- Pagination -->
        @if ((result()?.totalPages ?? 0) > 1) {
          <div class="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/60">
            <p class="text-sm text-slate-500">
              Showing {{ (currentPage() - 1) * pageSize + 1 }}–{{ min(currentPage() * pageSize, result()!.totalCount) }}
              of <span class="font-semibold text-slate-800">{{ result()!.totalCount }}</span> entries
            </p>
            <div class="flex items-center gap-1">
              <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1"
                class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors">‹</button>
              @for (p of pageNumbers(); track p) {
                <button (click)="goToPage(p)"
                  class="px-3 py-1.5 text-sm rounded-lg border transition-colors"
                  [class]="p === currentPage() ? 'bg-red-600 text-white border-red-600 font-semibold' : 'border-slate-200 bg-white hover:bg-slate-50'">
                  {{ p }}
                </button>
              }
              <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === result()!.totalPages"
                class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-50 transition-colors">›</button>
            </div>
          </div>
        }
      </div>
    </div>
  </div>
  `,
})
export class AuditLogsComponent implements OnInit {
  private auditSvc = inject(AuditLogService);

  loading     = signal(false);
  logs        = signal<AuditLogEntry[]>([]);
  result      = signal<PagedAuditLogResult | null>(null);
  expandedId  = signal<string | null>(null);
  activeTab   = signal<string>('all');
  currentPage = signal(1);
  pageSize    = 25;

  filters: AuditLogQuery = {};
  entityTypes = ['Bus', 'Route', 'Schedule', 'Booking', 'Stop', 'Auth'];

  tabs = [
    { id: 'all',   label: 'All Logs',    count: undefined },
    { id: 'Audit', label: 'Admin Ops',   count: undefined },
    { id: 'Error', label: 'Errors',      count: undefined },
  ];

  summaryCards = computed(() => {
    const items = this.logs();
    const total  = this.result()?.totalCount ?? 0;
    const errors = items.filter(l => l.logType === 'Error').length;
    const failed = items.filter(l => !l.isSuccess).length;
    const today  = items.filter(l => new Date(l.createdAtUtc).toDateString() === new Date().toDateString()).length;
    return [
      { label: 'Total Entries',  value: total,  bg: 'bg-blue-50',    iconColor: 'text-blue-600',   iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { label: 'Error Logs',     value: errors, bg: 'bg-red-50',     iconColor: 'text-red-600',    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
      { label: 'Failed Actions', value: failed, bg: 'bg-amber-50',   iconColor: 'text-amber-600',  iconPath: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
      { label: 'Today',          value: today,  bg: 'bg-emerald-50', iconColor: 'text-emerald-600', iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ];
  });

  pageNumbers = computed(() => {
    const total = this.result()?.totalPages ?? 1;
    const cur   = this.currentPage();
    const pages: number[] = [];
    for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) pages.push(i);
    return pages;
  });

  protected min = Math.min;

  ngOnInit() { this.loadLogs(); }

  loadLogs() {
    this.loading.set(true);
    const query: AuditLogQuery = {
      ...this.filters,
      logType:  this.activeTab() === 'all' ? undefined : this.activeTab(),
      page:     this.currentPage(),
      pageSize: this.pageSize,
    };
    this.auditSvc.getLogs(query).subscribe({
      next: res => { this.result.set(res); this.logs.set(res.items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setTab(id: string)   { this.activeTab.set(id); this.currentPage.set(1); this.loadLogs(); }
  applyFilters()       { this.currentPage.set(1); this.loadLogs(); }
  clearFilters()       { this.filters = {}; this.currentPage.set(1); this.loadLogs(); }
  toggleDetail(id: string) { this.expandedId.set(this.expandedId() === id ? null : id); }

  goToPage(page: number) {
    const total = this.result()?.totalPages ?? 1;
    if (page < 1 || page > total) return;
    this.currentPage.set(page);
    this.loadLogs();
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  }
}