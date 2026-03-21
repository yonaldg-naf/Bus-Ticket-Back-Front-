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
  <div class="min-h-screen bg-gray-50">

    <!-- Page Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <a routerLink="/admin" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div class="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white text-base shadow-sm">📋</div>
          <div>
            <h1 class="text-lg font-bold text-gray-900">Audit & Error Logs</h1>
            <p class="text-sm text-gray-500">System activity trail — admin access only</p>
          </div>
        </div>
        <button (click)="loadLogs()"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
          <svg class="w-4 h-4" [class.animate-spin]="loading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        @for (s of summaryCards(); track s.label) {
          <div class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg" [class]="s.bg">{{ s.icon }}</div>
              <div>
                <p class="text-2xl font-bold text-gray-900">{{ s.value }}</p>
                <p class="text-xs text-gray-500">{{ s.label }}</p>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Main Table Card -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        <!-- Tab Bar -->
        <div class="flex border-b border-gray-200 bg-gray-50/50">
          @for (tab of tabs; track tab.id) {
            <button (click)="setTab(tab.id)"
              class="px-5 py-3.5 text-sm font-medium transition-colors relative whitespace-nowrap"
              [class]="activeTab() === tab.id
                ? 'text-red-600 bg-white border-b-2 border-red-600 -mb-px'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'">
              {{ tab.label }}
              @if (tab.count !== undefined) {
                <span class="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                  [class]="activeTab() === tab.id ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'">
                  {{ tab.count }}
                </span>
              }
            </button>
          }
        </div>

        <!-- Filters -->
        <div class="px-5 py-4 border-b border-gray-100 bg-gray-50/40">
          <div class="flex flex-wrap gap-3 items-end">
            <div class="flex-1 min-w-[140px]">
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Username</label>
              <input [(ngModel)]="filters.username" (keyup.enter)="applyFilters()"
                placeholder="Search user…"
                class="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
            </div>
            <div class="min-w-[130px]">
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Entity</label>
              <select [(ngModel)]="filters.entityType" (change)="applyFilters()"
                class="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors">
                <option value="">All entities</option>
                @for (e of entityTypes; track e) { <option [value]="e">{{ e }}</option> }
              </select>
            </div>
            <div class="min-w-[120px]">
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
              <select [(ngModel)]="filters.isSuccess" (change)="applyFilters()"
                class="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors">
                <option [ngValue]="undefined">All</option>
                <option [ngValue]="true">Success</option>
                <option [ngValue]="false">Failed</option>
              </select>
            </div>
            <div class="min-w-[140px]">
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">From</label>
              <input type="date" [(ngModel)]="filters.from" (change)="applyFilters()"
                class="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors"/>
            </div>
            <div class="min-w-[140px]">
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">To</label>
              <input type="date" [(ngModel)]="filters.to" (change)="applyFilters()"
                class="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors"/>
            </div>
            <div class="flex gap-2">
              <button (click)="clearFilters()"
                class="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
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
            <div class="flex items-center justify-center py-20 gap-3 text-gray-400">
              <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Loading logs…
            </div>
          } @else if (logs().length === 0) {
            <div class="flex flex-col items-center justify-center py-20 text-gray-400">
              <span class="text-5xl mb-3">📭</span>
              <p class="font-semibold text-gray-500">No logs found</p>
              <p class="text-sm mt-1">Try adjusting your filters</p>
            </div>
          } @else {
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 border-b border-gray-200 text-left">
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th class="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ms</th>
                  <th class="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                @for (log of logs(); track log.id) {
                  <tr (click)="toggleDetail(log.id)"
                    class="hover:bg-gray-50 transition-colors cursor-pointer"
                    [class.bg-red-50]="!log.isSuccess && expandedId() !== log.id"
                    [class.bg-red-100]="!log.isSuccess && expandedId() === log.id"
                    [class.bg-blue-50]="log.isSuccess && expandedId() === log.id">

                    <td class="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                      {{ formatTime(log.createdAtUtc) }}
                    </td>

                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                        [class]="log.logType === 'Error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'">
                        {{ log.logType === 'Error' ? '⚠️' : '✅' }} {{ log.logType }}
                      </span>
                    </td>

                    <td class="px-4 py-3 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700 flex-shrink-0">
                          {{ (log.username ?? 'S')[0].toUpperCase() }}
                        </div>
                        <div>
                          <p class="text-xs font-medium text-gray-800">{{ log.username ?? 'System' }}</p>
                          @if (log.userRole) { <p class="text-xs text-gray-400">{{ log.userRole }}</p> }
                        </div>
                      </div>
                    </td>

                    <td class="px-4 py-3 text-gray-700 max-w-xs">
                      <span class="line-clamp-1" [title]="log.description">{{ log.description }}</span>
                    </td>

                    <td class="px-4 py-3 whitespace-nowrap">
                      @if (log.entityType) {
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {{ log.entityType }}
                        </span>
                      } @else { <span class="text-gray-300 text-xs">—</span> }
                    </td>

                    <td class="px-4 py-3 whitespace-nowrap">
                      <div class="flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full flex-shrink-0" [class]="log.isSuccess ? 'bg-green-500' : 'bg-red-500'"></span>
                        @if (log.statusCode) {
                          <span class="text-xs font-mono" [class]="(log.statusCode ?? 0) >= 400 ? 'text-red-600 font-semibold' : 'text-gray-600'">
                            {{ log.statusCode }}
                          </span>
                        }
                      </div>
                    </td>

                    <td class="px-4 py-3 whitespace-nowrap text-xs text-gray-500 font-mono">
                      {{ log.durationMs != null ? log.durationMs + 'ms' : '—' }}
                    </td>

                    <td class="px-4 py-3">
                      <svg class="w-4 h-4 text-gray-400 transition-transform duration-200"
                        [class.rotate-180]="expandedId() === log.id"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </td>
                  </tr>

                  @if (expandedId() === log.id) {
                    <tr class="border-b border-gray-200">
                      <td colspan="8" class="px-6 py-4 bg-gray-50">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div class="space-y-2">
                            <p class="font-bold text-gray-600 uppercase tracking-wide text-xs">Request Details</p>
                            <div class="space-y-1 text-gray-700">
                              <p><span class="text-gray-400 w-20 inline-block">Method:</span><span class="font-mono font-semibold">{{ log.httpMethod ?? '—' }}</span></p>
                              <p><span class="text-gray-400 w-20 inline-block">Endpoint:</span><span class="font-mono break-all">{{ log.endpoint ?? '—' }}</span></p>
                              <p><span class="text-gray-400 w-20 inline-block">Entity ID:</span><span class="font-mono">{{ log.entityId ?? '—' }}</span></p>
                              <p><span class="text-gray-400 w-20 inline-block">Log ID:</span><span class="font-mono text-gray-400">{{ log.id }}</span></p>
                            </div>
                          </div>
                          @if (log.detail) {
                            <div class="space-y-2">
                              <p class="font-bold text-red-600 uppercase tracking-wide text-xs">Stack Trace</p>
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
          <div class="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-gray-50/60">
            <p class="text-sm text-gray-500">
              Showing {{ (currentPage() - 1) * pageSize + 1 }}–{{ min(currentPage() * pageSize, result()!.totalCount) }}
              of <span class="font-semibold text-gray-800">{{ result()!.totalCount }}</span> entries
            </p>
            <div class="flex items-center gap-1">
              <button (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1"
                class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors">‹</button>
              @for (p of pageNumbers(); track p) {
                <button (click)="goToPage(p)"
                  class="px-3 py-1.5 text-sm rounded-lg border transition-colors"
                  [class]="p === currentPage() ? 'bg-red-600 text-white border-red-600 font-semibold' : 'border-gray-300 bg-white hover:bg-gray-50'">
                  {{ p }}
                </button>
              }
              <button (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === result()!.totalPages"
                class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white disabled:opacity-40 hover:bg-gray-50 transition-colors">›</button>
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
    { id: 'Audit', label: '✅ Admin Ops', count: undefined },
    { id: 'Error', label: '⚠️ Errors',   count: undefined },
  ];

  summaryCards = computed(() => {
    const items = this.logs();
    const total  = this.result()?.totalCount ?? 0;
    const errors = items.filter(l => l.logType === 'Error').length;
    const failed = items.filter(l => !l.isSuccess).length;
    const today  = items.filter(l => new Date(l.createdAtUtc).toDateString() === new Date().toDateString()).length;
    return [
      { label: 'Total Entries',  value: total,  icon: '📋', bg: 'bg-blue-50'   },
      { label: 'Error Logs',     value: errors, icon: '⚠️', bg: 'bg-red-50'    },
      { label: 'Failed Actions', value: failed, icon: '❌', bg: 'bg-orange-50' },
      { label: 'Today',          value: today,  icon: '📅', bg: 'bg-green-50'  },
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