import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserManagementService } from '../../../services/user-management.service';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  createdAtUtc: string;
}

export interface UserListResult {
  total: number;
  page: number;
  pageSize: number;
  items: AdminUser[];
}

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">

    <!-- Top Bar -->
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <a routerLink="/admin" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-500 dark:text-slate-300 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 class="text-base font-bold text-slate-900 dark:text-white">User Management</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ total() }} registered users</p>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="max-w-7xl mx-auto px-6 pb-4 flex items-center gap-3 flex-wrap">
        <div class="relative flex-1 min-w-[200px] max-w-sm">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input [(ngModel)]="search" (input)="onSearch()" type="text"
            placeholder="Search name, email, username…"
            class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
        </div>
        <div class="flex rounded-lg border border-slate-200 bg-white overflow-hidden text-sm">
          @for (r of roleFilters; track r.value) {
            <button (click)="setRole(r.value)"
              class="px-4 py-2 font-medium transition-colors border-r border-slate-200 last:border-r-0"
              [class]="activeRole === r.value ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-50'">
              {{ r.label }}
            </button>
          }
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-6 py-6">

      <!-- Loading Skeleton -->
      @if (loading()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          @for (_ of [1,2,3,4,5]; track $index) {
            <div class="px-6 py-4 border-b border-slate-100 animate-pulse flex items-center gap-4">
              <div class="w-9 h-9 rounded-full bg-slate-200"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-slate-200 rounded w-40"></div>
                <div class="h-3 bg-slate-100 rounded w-56"></div>
              </div>
              <div class="h-6 bg-slate-100 rounded-full w-20"></div>
            </div>
          }
        </div>
      }

      <!-- Empty -->
      @if (!loading() && users().length === 0) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center py-20 text-center">
          <div class="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
            <svg class="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <p class="font-semibold text-slate-700 dark:text-slate-300">No users found</p>
          <p class="text-sm text-slate-400 mt-1">Try changing your search or filter</p>
        </div>
      }

      <!-- Table -->
      @if (!loading() && users().length > 0) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="px-6 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">All Users</span>
            <span class="text-xs text-slate-400">{{ total() }} total</span>
          </div>
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-left">
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">User</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Username</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Role</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Registered</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-700">
              @for (u of users(); track u.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        [class]="avatarClass(u.role)">
                        {{ u.fullName[0]?.toUpperCase() }}
                      </div>
                      <span class="font-medium text-slate-900 dark:text-white">{{ u.fullName }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 font-mono text-slate-500 text-xs hidden sm:table-cell">{{ u.username }}</td>
                  <td class="px-6 py-4 text-slate-500 hidden md:table-cell">{{ u.email }}</td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" [class]="roleBadge(u.role)">
                      {{ u.role }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-slate-400 text-xs hidden lg:table-cell">{{ formatDate(u.createdAtUtc) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="flex items-center justify-between mt-5">
            <p class="text-sm text-slate-500">
              Showing {{ (page - 1) * pageSize + 1 }}–{{ pageEnd() }} of {{ total() }} users
            </p>
            <div class="flex items-center gap-1">
              <button (click)="goPage(page - 1)" [disabled]="page === 1"
                class="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600
                       hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">‹
              </button>
              @for (p of pageNumbers(); track p) {
                <button (click)="goPage(p)"
                  class="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors"
                  [class]="p === page ? 'bg-red-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'">
                  {{ p }}
                </button>
              }
              <button (click)="goPage(page + 1)" [disabled]="page === totalPages()"
                class="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600
                       hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">›
              </button>
            </div>
          </div>
        }
      }
    </div>
  </div>
  `,
})
export class ManageUsersComponent implements OnInit {
  private svc = inject(UserManagementService);

  loading    = signal(true);
  users      = signal<AdminUser[]>([]);
  total      = signal(0);
  page       = 1;
  pageSize   = 15;
  search     = '';
  activeRole = '';
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  roleFilters = [
    { value: '',                label: 'All'       },
    { value: 'Customer',        label: 'Customers' },
    { value: 'Operator',        label: 'Operators' },
    { value: 'PendingOperator', label: 'Pending'   },
    { value: 'Admin',           label: 'Admins'    },
  ];

  totalPages(): number { return Math.ceil(this.total() / this.pageSize); }
  pageNumbers(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1).filter(p => Math.abs(p - this.page) <= 2);
  }
  pageEnd(): number { return Math.min(this.page * this.pageSize, this.total()); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.getUsers({
      role:     this.activeRole || undefined,
      search:   this.search     || undefined,
      page:     this.page,
      pageSize: this.pageSize,
    }).subscribe({
      next:  (r: UserListResult) => { this.users.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.load(); }, 350);
  }

  setRole(role: string): void { this.activeRole = role; this.page = 1; this.load(); }

  goPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) { this.page = p; this.load(); }
  }

  roleBadge(role: string): string {
    const m: Record<string, string> = {
      Admin:           'bg-purple-100 text-purple-700',
      Operator:        'bg-blue-100 text-blue-700',
      Customer:        'bg-emerald-100 text-emerald-700',
      PendingOperator: 'bg-amber-100 text-amber-700',
    };
    return m[role] ?? 'bg-slate-100 text-slate-600';
  }

  avatarClass(role: string): string {
    const m: Record<string, string> = {
      Admin: 'bg-purple-500', Operator: 'bg-blue-500',
      Customer: 'bg-emerald-500', PendingOperator: 'bg-amber-400',
    };
    return m[role] ?? 'bg-slate-400';
  }

  formatDate(utc: string): string {
    return new Date(utc).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
