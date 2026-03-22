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
  <div class="min-h-screen bg-gray-50">

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
        <a routerLink="/admin" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
        <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-base shadow-sm">👥</div>
        <div>
          <h1 class="text-lg font-bold text-gray-900">User Management</h1>
          <p class="text-sm text-gray-500">All registered users — {{ total() }} total</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-4 flex items-center gap-3 flex-wrap">
        <input [(ngModel)]="search" (input)="onSearch()" type="text"
          placeholder="Search name, email, username…"
          class="form-input py-2 text-sm w-64"/>
        <div class="flex rounded-lg border border-gray-200 bg-white overflow-hidden text-sm">
          @for (r of roleFilters; track r.value) {
            <button (click)="setRole(r.value)"
              class="px-4 py-2 font-medium transition-colors"
              [class]="activeRole === r.value ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'">
              {{ r.label }}
            </button>
          }
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">

      <!-- Loading -->
      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1,2,3,4,5]; track $index) {
            <div class="card p-4 animate-pulse flex items-center gap-4">
              <div class="w-10 h-10 rounded-full skeleton"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 skeleton w-48 rounded"></div>
                <div class="h-3 skeleton w-64 rounded"></div>
              </div>
              <div class="h-6 skeleton w-24 rounded-full"></div>
            </div>
          }
        </div>
      }

      <!-- Empty -->
      @if (!loading() && users().length === 0) {
        <div class="flex flex-col items-center justify-center py-20">
          <div class="text-5xl mb-4">🔍</div>
          <p class="font-semibold text-gray-700">No users found</p>
          <p class="text-sm text-gray-400 mt-1">Try changing your search or filter</p>
        </div>
      }

      <!-- Table -->
      @if (!loading() && users().length > 0) {
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-200 text-left">
                <th class="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th class="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
                <th class="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                <th class="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th class="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Registered</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              @for (u of users(); track u.id) {
                <tr class="hover:bg-gray-50 transition-colors">
                  <td class="px-5 py-3.5">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        [class]="avatarClass(u.role)">
                        {{ u.fullName[0]?.toUpperCase() }}
                      </div>
                      <span class="font-semibold text-gray-900">{{ u.fullName }}</span>
                    </div>
                  </td>
                  <td class="px-5 py-3.5 font-mono text-gray-600">@{{ u.username }}</td>
                  <td class="px-5 py-3.5 text-gray-500 hidden md:table-cell">{{ u.email }}</td>
                  <td class="px-5 py-3.5">
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                      [class]="roleBadge(u.role)">
                      {{ roleIcon(u.role) }} {{ u.role }}
                    </span>
                  </td>
                  <td class="px-5 py-3.5 text-gray-400 text-xs hidden lg:table-cell">{{ formatDate(u.createdAtUtc) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="flex items-center justify-between mt-5">
            <p class="text-sm text-gray-500">
              Showing {{ (page - 1) * pageSize + 1 }}–{{ pageEnd() }} of {{ total() }} users
            </p>
            <div class="flex items-center gap-1">
              <button (click)="goPage(page - 1)" [disabled]="page === 1"
                class="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600
                       hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">‹
              </button>
              @for (p of pageNumbers(); track p) {
                <button (click)="goPage(p)"
                  class="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors"
                  [class]="p === page ? 'bg-red-600 text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'">
                  {{ p }}
                </button>
              }
              <button (click)="goPage(page + 1)" [disabled]="page === totalPages()"
                class="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600
                       hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">›
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

  totalPages(): number {
    return Math.ceil(this.total() / this.pageSize);
  }

  pageNumbers(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1)
                .filter(p => Math.abs(p - this.page) <= 2);
  }

  pageEnd(): number {
    return Math.min(this.page * this.pageSize, this.total());
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.getUsers({
      role:     this.activeRole || undefined,
      search:   this.search     || undefined,
      page:     this.page,
      pageSize: this.pageSize,
    }).subscribe({
      next:  (r: UserListResult) => {
        this.users.set(r.items);
        this.total.set(r.total);
        this.loading.set(false);
      },
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
      Customer:        'bg-green-100 text-green-700',
      PendingOperator: 'bg-orange-100 text-orange-700',
    };
    return m[role] ?? 'bg-gray-100 text-gray-600';
  }

  roleIcon(role: string): string {
    const m: Record<string, string> = {
      Admin: '🛡️', Operator: '🚌', Customer: '🧳', PendingOperator: '⏳',
    };
    return m[role] ?? '';
  }

  avatarClass(role: string): string {
    const m: Record<string, string> = {
      Admin: 'bg-purple-500', Operator: 'bg-blue-500',
      Customer: 'bg-green-500', PendingOperator: 'bg-orange-400',
    };
    return m[role] ?? 'bg-gray-400';
  }

  formatDate(utc: string): string {
    return new Date(utc).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }
}