import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../../services/booking.service';
import { ToastService } from '../../../services/toast.service';
import { BookingResponse, BookingStatus, BookingStatusLabels } from '../../../models/booking.models';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="min-h-screen bg-gray-50">

    <!-- Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-gray-900">My Bookings</h1>
          <p class="text-sm text-gray-500 mt-0.5">Your upcoming and past trips</p>
        </div>
        <a routerLink="/home" class="btn-primary">+ New Booking</a>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6">

      <!-- Filter tabs -->
      <div class="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit">
        @for (tab of tabs; track tab.id) {
          <button (click)="activeFilter.set(tab.id)"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            [class]="activeFilter() === tab.id ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'">
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="space-y-4">
          @for (_ of [1,2,3]; track $index) {
            <div class="card p-5 animate-pulse">
              <div class="flex justify-between items-start">
                <div class="space-y-2">
                  <div class="h-5 skeleton w-36 rounded"></div>
                  <div class="h-4 skeleton w-52 rounded"></div>
                  <div class="h-4 skeleton w-40 rounded"></div>
                </div>
                <div class="h-9 skeleton w-20 rounded-lg"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && filtered().length === 0) {
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center text-4xl mb-4">🎫</div>
          <h3 class="text-lg font-bold text-gray-800">No bookings found</h3>
          <p class="text-gray-500 mt-1.5 text-sm">
            {{ activeFilter() === 'all' ? 'You have not made any bookings yet.' : 'No ' + activeFilter() + ' bookings.' }}
          </p>
          <a routerLink="/home" class="btn-primary mt-6">Find Buses</a>
        </div>
      }

      <!-- Booking cards -->
      <div class="space-y-4">
        @for (b of filtered(); track b.id) {
          <div class="card hover:shadow-md transition-all group">
            <div class="p-5">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                <div class="flex items-start gap-4 flex-1 min-w-0">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                    [class]="statusBg(b.status)">🎫</div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-1">
                      <span class="font-bold text-gray-900 text-base">{{ b.busCode }}</span>
                      <span class="badge" [class]="badgeClass(b.status)">{{ statusLabel(b.status) }}</span>
                      <span class="text-sm text-gray-500 font-mono">{{ b.routeCode }}</span>
                    </div>
                    <div class="flex items-center gap-1 text-sm text-gray-600 mb-1">
                      <svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {{ formatDateTime(b.departureUtc) }}
                    </div>
                    <div class="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                      <span>{{ b.passengers.length }} passenger{{ b.passengers.length !== 1 ? 's' : '' }}</span>
                      <span>·</span>
                      <span class="font-semibold text-gray-700">₹{{ b.totalAmount | number:'1.0-0' }}</span>
                      <span>·</span>
                      <span>Seats: {{ b.passengers.map(p => p.seatNo).join(', ') }}</span>
                    </div>
                  </div>
                </div>

                <a [routerLink]="['/my-bookings', b.id]"
                  class="btn-secondary self-start sm:self-center flex-shrink-0
                         group-hover:border-red-300 group-hover:text-red-600 transition-colors">
                  View Details →
                </a>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  </div>
  `,
})
export class BookingListComponent implements OnInit {
  private bookingSvc = inject(BookingService);
  private toast      = inject(ToastService);

  loading      = signal(true);
  bookings     = signal<BookingResponse[]>([]);
  activeFilter = signal<string>('all');

  tabs = [
    { id: 'all',       label: 'All'       },
    { id: 'upcoming',  label: 'Upcoming'  },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  filtered = computed(() => {
    const all = this.bookings();
    const f   = this.activeFilter();
    if (f === 'all')       return all;
    if (f === 'upcoming')  return all.filter(b => b.status === BookingStatus.Pending || b.status === BookingStatus.Confirmed);
    if (f === 'completed') return all.filter(b => b.status === BookingStatus.Refunded);
    if (f === 'cancelled') return all.filter(b => b.status === BookingStatus.Cancelled || b.status === BookingStatus.OperatorCancelled);
    return all;
  });

  ngOnInit() {
    this.bookingSvc.getMyBookings().subscribe({
      next:  d  => { this.bookings.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Failed to load bookings.'); },
    });
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  statusLabel(s: BookingStatus): string { return BookingStatusLabels[s] ?? String(s); }

  badgeClass(s: BookingStatus): string {
    const map: Record<number, string> = {
      [BookingStatus.Pending]:           'badge badge-warning',
      [BookingStatus.Confirmed]:         'badge badge-success',
      [BookingStatus.Refunded]:          'badge badge-gray',
      [BookingStatus.Cancelled]:         'badge badge-error',
      [BookingStatus.OperatorCancelled]: 'badge badge-error',
    };
    return map[s] ?? 'badge badge-gray';
  }

  statusBg(s: BookingStatus): string {
    const map: Record<number, string> = {
      [BookingStatus.Pending]:           'bg-yellow-50',
      [BookingStatus.Confirmed]:         'bg-green-50',
      [BookingStatus.Refunded]:          'bg-gray-100',
      [BookingStatus.Cancelled]:         'bg-red-50',
      [BookingStatus.OperatorCancelled]: 'bg-red-50',
    };
    return map[s] ?? 'bg-gray-100';
  }
}