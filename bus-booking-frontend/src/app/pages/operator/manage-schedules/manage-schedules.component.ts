import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScheduleService, ScheduleResponse } from '../../../services/schedule.service';
import { BusService, BusResponse } from '../../../services/bus-route.service';
import { RouteService, RouteResponse } from '../../../services/bus-route.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-manage-schedules',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  template: `
  <div class="min-h-screen bg-slate-50">
    <div class="bg-white border-b border-slate-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <a routerLink="/operator" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors text-slate-500 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <div>
            <h1 class="text-base font-bold text-slate-900">Manage Schedules</h1>
            <p class="text-xs text-slate-500">Create and manage departure schedules</p>
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
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 class="font-bold text-slate-900">{{ editId() ? 'Edit Schedule' : 'New Schedule' }}</h2>
            <button (click)="closeForm()" class="text-slate-400 hover:text-slate-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()" class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Bus *</label>
              <select formControlName="busCode" class="input-field">
                <option value="">Select bus...</option>
                @for (b of buses(); track b.id) {
                  <option [value]="b.code">{{ b.code }} - {{ b.registrationNumber }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Route *</label>
              <select formControlName="routeCode" class="input-field">
                <option value="">Select route...</option>
                @for (r of routes(); track r.id) {
                  <option [value]="r.routeCode">{{ r.routeCode }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Departure (Local Time) *</label>
              <input formControlName="departureLocal" type="datetime-local" class="input-field"/>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Base Price (Rs) *</label>
              <input formControlName="basePrice" type="number" min="1" placeholder="e.g. 500" class="input-field"/>
            </div>
            <div class="sm:col-span-2 flex gap-3 pt-2">
              <button type="submit" [disabled]="form.invalid || saving()" class="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                {{ saving() ? 'Saving...' : (editId() ? 'Update Schedule' : 'Create Schedule') }}
              </button>
              <button type="button" (click)="closeForm()" class="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      }
      <div class="flex gap-3">
        <input [(ngModel)]="search" placeholder="Search bus or route..." class="flex-1 min-w-[200px] text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"/>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 class="font-bold text-slate-900">All Schedules</h2>
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
            <p class="text-4xl mb-3">schedule</p>
            <p class="font-medium text-slate-500">No schedules found</p>
            <p class="text-sm mt-1">Create your first schedule above</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-100">
                  <th class="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bus</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Route</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Departure</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Seats</th>
                  <th class="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (s of filtered(); track s.id) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4">
                      <p class="font-semibold text-slate-800">{{ s.busCode }}</p>
                      <p class="text-xs text-slate-400 font-mono">{{ s.registrationNumber }}</p>
                    </td>
                    <td class="px-4 py-4">
                      <span class="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">{{ s.routeCode }}</span>
                    </td>
                    <td class="px-4 py-4">
                      <p class="font-medium text-slate-800">{{ formatDate(s.departureUtc) }}</p>
                      <p class="text-xs text-slate-400">{{ formatTime(s.departureUtc) }}</p>
                    </td>
                    <td class="px-4 py-4 text-right font-bold text-red-600">Rs {{ s.basePrice | number:'1.0-0' }}</td>
                    <td class="px-4 py-4 text-right text-slate-600">{{ s.totalSeats }}</td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button (click)="openEdit(s)" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Edit</button>
                        <button (click)="remove(s.id)" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Delete</button>
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

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  editId = signal<string | null>(null);
  schedules = signal<ScheduleResponse[]>([]);
  buses = signal<BusResponse[]>([]);
  routes = signal<RouteResponse[]>([]);
  search = '';

  form = this.fb.group({
    busCode: ['', Validators.required],
    routeCode: ['', Validators.required],
    departureLocal: ['', Validators.required],
    basePrice: [0, [Validators.required, Validators.min(1)]],
  });

  filtered = computed(() => {
    const q = this.search.toLowerCase();
    return this.schedules().filter(s =>
      !q || s.busCode.toLowerCase().includes(q) || s.routeCode.toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.loadAll();
    this.busSvc.getAll().subscribe({ next: d => this.buses.set(d), error: () => {} });
    this.routeSvc.getAll().subscribe({ next: d => this.routes.set(d), error: () => {} });
  }

  loadAll() {
    this.loading.set(true);
    this.scheduleSvc.getAll().subscribe({
      next: d => { this.schedules.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openCreate() {
    this.editId.set(null);
    this.form.reset({ busCode: '', routeCode: '', departureLocal: '', basePrice: 0 });
    this.showForm.set(true);
  }

  openEdit(s: ScheduleResponse) {
    this.editId.set(s.id);
    const d = new Date(s.departureUtc);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    this.form.setValue({ busCode: s.busCode, routeCode: s.routeCode, departureLocal: localStr, basePrice: s.basePrice });
    this.showForm.set(true);
  }

  closeForm() { this.showForm.set(false); this.editId.set(null); }

  save() {
    if (this.form.invalid) return;
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
    if (!confirm('Delete this schedule?')) return;
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