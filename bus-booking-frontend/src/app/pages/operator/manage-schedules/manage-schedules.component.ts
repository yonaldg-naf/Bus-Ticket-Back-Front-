import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScheduleService, ScheduleResponse } from '../../../services/schedule.service';
import { BusService, BusResponse } from '../../../services/bus-route.service';
import { RouteService, RouteResponse } from '../../../services/bus-route.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-manage-schedules',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <a routerLink="/operator" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-500 dark:text-slate-300 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <div>
            <h1 class="text-base font-bold text-slate-900 dark:text-white">Manage Schedules</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">Create and manage departure schedules</p>
          </div>
        </div>
        <button (click)="openCreate()" class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-red-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          New Schedule
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      @if (showForm()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 class="font-bold text-slate-900 dark:text-white">{{ editId() ? 'Edit Schedule' : 'New Schedule' }}</h2>
            <button (click)="closeForm()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()" class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Bus *</label>
              <select formControlName="busCode" class="input-field dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                <option value="">Select bus...</option>
                @for (b of buses(); track b.id) {
                  <option [value]="b.code">{{ b.code }} - {{ b.registrationNumber }}</option>
                }
              </select>
              @if (isInvalid('busCode')) { <p class="text-xs text-red-500 mt-1">Bus is required</p> }
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Route *</label>
              <select formControlName="routeCode" class="input-field dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                <option value="">Select route...</option>
                @for (r of routes(); track r.id) {
                  <option [value]="r.routeCode">{{ r.routeCode }}</option>
                }
              </select>
              @if (isInvalid('routeCode')) { <p class="text-xs text-red-500 mt-1">Route is required</p> }
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Departure (Local Time) *</label>
              <input formControlName="departureLocal" type="datetime-local" class="input-field dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
              @if (isInvalid('departureLocal')) { <p class="text-xs text-red-500 mt-1">Departure time is required</p> }
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Base Price (Rs) *</label>
              <input formControlName="basePrice" type="number" min="1" placeholder="e.g. 500" class="input-field dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
              @if (isInvalid('basePrice')) { <p class="text-xs text-red-500 mt-1">Price must be at least 1</p> }
            </div>
            <div class="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" [disabled]="form.invalid || saving()" class="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                {{ saving() ? 'Saving...' : (editId() ? 'Update Schedule' : 'Create Schedule') }}
              </button>
              <button type="button" (click)="closeForm()" class="px-6 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      }

      @if (cancelTarget()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 class="font-bold text-slate-900 dark:text-white">Cancel Trip</h2>
              <button (click)="cancelTarget.set(null)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="p-6 space-y-4">
              <p class="text-sm text-slate-600 dark:text-slate-300">
                Cancelling schedule for <span class="font-bold text-slate-900 dark:text-white">{{ cancelTarget()!.busCode }}</span>
                on route <span class="font-mono font-semibold text-slate-700 dark:text-slate-200">{{ cancelTarget()!.routeCode }}</span>.
              </p>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Cancellation Reason *</label>
                <textarea [(ngModel)]="cancelReason" rows="3" placeholder="e.g. Vehicle breakdown, weather conditions..."
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"></textarea>
              </div>
              <div class="flex gap-3 pt-1">
                <button (click)="confirmCancel()" [disabled]="!cancelReason.trim() || cancelling()"
                  class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                  {{ cancelling() ? 'Cancelling...' : 'Confirm Cancellation' }}
                </button>
                <button (click)="cancelTarget.set(null)" class="px-5 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Keep Trip
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <div class="flex gap-3">
        <input [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Search bus or route..."
          class="flex-1 min-w-[200px] text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"/>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h2 class="font-bold text-slate-900 dark:text-white">All Schedules</h2>
          <span class="text-xs text-slate-400">{{ filtered().length }} schedules</span>
        </div>
        @if (loading()) {
          <div class="flex items-center justify-center py-16 gap-3 text-slate-400">
            <svg class="animate-spin w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Loading schedules...
          </div>
        } @else if (filtered().length === 0) {
          <div class="text-center py-16 text-slate-400">
            <p class="text-4xl mb-3">&#128197;</p>
            <p class="font-medium text-slate-500 dark:text-slate-400">No schedules found</p>
            <p class="text-sm mt-1">Create your first schedule above</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <th class="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Bus</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Route</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Departure</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Price</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Seats</th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                  <th class="text-right px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50 dark:divide-slate-700">
                @for (s of filtered(); track s.id) {
                  <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors" [class.opacity-60]="s.isCancelledByOperator">
                    <td class="px-6 py-4">
                      <p class="font-semibold text-slate-800 dark:text-white">{{ s.busCode }}</p>
                      <p class="text-xs text-slate-400 font-mono">{{ s.registrationNumber }}</p>
                    </td>
                    <td class="px-4 py-4">
                      <span class="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">{{ s.routeCode }}</span>
                    </td>
                    <td class="px-4 py-4">
                      <p class="font-medium text-slate-800 dark:text-white">{{ formatDate(s.departureUtc) }}</p>
                      <p class="text-xs text-slate-400">{{ formatTime(s.departureUtc) }}</p>
                    </td>
                    <td class="px-4 py-4 text-right font-bold text-red-600">Rs {{ s.basePrice | number:'1.0-0' }}</td>
                    <td class="px-4 py-4 text-right text-slate-600 dark:text-slate-300">{{ s.totalSeats }}</td>
                    <td class="px-4 py-4 text-center">
                      @if (s.isCancelledByOperator) {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Cancelled</span>
                      } @else {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                      }
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        @if (!s.isCancelledByOperator) {
                          <button (click)="openEdit(s)" class="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Edit</button>
                          <button (click)="openCancelTrip(s)" class="px-3 py-1.5 text-xs font-semibold rounded-xl border border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">Cancel Trip</button>
                        }
                        <button (click)="remove(s.id)" class="px-3 py-1.5 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  </div>
  `,
})
export class ManageSchedulesComponent implements OnInit {
  private scheduleSvc = inject(ScheduleService);
  private busSvc = inject(BusService);
  private routeSvc = inject(RouteService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  loading = signal(true);
  saving = signal(false);
  cancelling = signal(false);
  showForm = signal(false);
  editId = signal<string | null>(null);
  schedules = signal<ScheduleResponse[]>([]);
  buses = signal<BusResponse[]>([]);
  routes = signal<RouteResponse[]>([]);
  cancelTarget = signal<ScheduleResponse | null>(null);
  cancelReason = '';
  search = signal('');

  form = this.fb.group({
    busCode: ['', Validators.required],
    routeCode: ['', Validators.required],
    departureLocal: ['', Validators.required],
    basePrice: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.schedules().filter(s =>
      !q || s.busCode.toLowerCase().includes(q) || s.routeCode.toLowerCase().includes(q)
    );
  });

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  ngOnInit() {
    this.loadAll();
    this.busSvc.getAll().subscribe({ next: d => this.buses.set(d), error: () => {} });
    this.routeSvc.getAll().subscribe({ next: d => this.routes.set(d), error: () => {} });
  }

  loadAll() {
    this.loading.set(true);
    this.scheduleSvc.getAll().subscribe({
      next: d => { this.schedules.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Failed to load schedules.'); },
    });
  }

  openCreate() {
    this.editId.set(null);
    this.form.reset({ busCode: '', routeCode: '', departureLocal: '', basePrice: null });
    this.form.markAsUntouched();
    this.showForm.set(true);
  }

  openEdit(s: ScheduleResponse) {
    this.editId.set(s.id);
    const d = new Date(s.departureUtc);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    this.form.setValue({ busCode: s.busCode, routeCode: s.routeCode, departureLocal: localStr, basePrice: s.basePrice });
    this.form.markAsUntouched();
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editId.set(null); }

  openCancelTrip(s: ScheduleResponse) {
    this.cancelReason = '';
    this.cancelTarget.set(s);
  }

  confirmCancel() {
    const target = this.cancelTarget();
    if (!target || !this.cancelReason.trim()) return;
    this.cancelling.set(true);
    this.scheduleSvc.cancel(target.id, this.cancelReason.trim()).subscribe({
      next: updated => {
        this.schedules.update(l => l.map(s => s.id === updated.id ? updated : s));
        this.cancelling.set(false);
        this.cancelTarget.set(null);
        this.toast.success('Trip cancelled. All passengers have been notified.');
      },
      error: err => {
        this.cancelling.set(false);
        this.toast.error(err.error?.message ?? 'Cancellation failed.');
      },
    });
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    this.saving.set(true);
    if (this.editId()) {
      this.scheduleSvc.update(this.editId()!, {
        busId: '', routeId: '',
        departureUtc: new Date(v.departureLocal!).toISOString(),
        basePrice: v.basePrice!,
      }).subscribe({
        next: u => { this.schedules.update(l => l.map(s => s.id === u.id ? u : s)); this.saving.set(false); this.closeForm(); this.toast.success('Schedule updated.'); },
        error: err => { this.saving.set(false); this.toast.error(err.error?.message ?? 'Update failed.'); },
      });
    } else {
      this.scheduleSvc.createByKeys({
        operatorUsername: this.auth.currentUser()?.username,
        busCode: v.busCode!,
        routeCode: v.routeCode!,
        departureLocal: v.departureLocal!,
        timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
        basePrice: v.basePrice!,
      }).subscribe({
        next: c => { this.schedules.update(l => [c, ...l]); this.saving.set(false); this.closeForm(); this.toast.success('Schedule created.'); },
        error: err => { this.saving.set(false); this.toast.error(err.error?.message ?? 'Create failed.'); },
      });
    }
  }

  remove(id: string) {
    if (!confirm('Permanently delete this schedule?')) return;
    this.scheduleSvc.delete(id).subscribe({
      next: () => { this.schedules.update(l => l.filter(s => s.id !== id)); this.toast.success('Deleted.'); },
      error: err => this.toast.error(err.error?.message ?? 'Delete failed.'),
    });
  }

  formatDate(utc: string): string {
    return new Date(utc).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatTime(utc: string): string {
    return new Date(utc).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
}
