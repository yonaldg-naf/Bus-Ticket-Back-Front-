import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ScheduleService, ScheduleResponse } from '../../../services/schedule.service';
import { BusService, BusResponse } from '../../../services/bus-route.service';
import { RouteService, RouteResponse } from '../../../services/bus-route.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-manage-schedules',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <a routerLink="/admin" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-500 dark:text-slate-300 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <div>
            <h1 class="text-base font-bold text-slate-900 dark:text-white">Schedule Management</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ schedules().length }} schedules</p>
          </div>
        </div>
        <button (click)="openForm()" class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-red-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Add Schedule
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      @if (showForm()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 class="font-bold text-slate-900 dark:text-white">{{ editingId() ? 'Edit Schedule' : 'Create Schedule' }}</h3>
            <button (click)="cancelForm()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="p-6">
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              @if (!editingId()) {
                <div>
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Bus *</label>
                  <select formControlName="busId" class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none">
                    <option value="">Select bus…</option>
                    @for (b of buses(); track b.id) { <option [value]="b.id">{{ b.code }} ({{ b.registrationNumber }})</option> }
                  </select>
                  @if (isInvalid('busId')) { <p class="text-xs text-red-500 mt-1">Required</p> }
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Route *</label>
                  <select formControlName="routeId" class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none">
                    <option value="">Select route…</option>
                    @for (r of routes(); track r.id) { <option [value]="r.id">{{ r.routeCode }}</option> }
                  </select>
                  @if (isInvalid('routeId')) { <p class="text-xs text-red-500 mt-1">Required</p> }
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Departure (UTC) *</label>
                  <input formControlName="departureUtc" type="datetime-local"
                    class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none"/>
                  @if (isInvalid('departureUtc')) { <p class="text-xs text-red-500 mt-1">Required</p> }
                </div>
              } @else {
                <div>
                  <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Departure (Local) *</label>
                  <input formControlName="departureLocal" type="datetime-local"
                    class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none"/>
                </div>
              }
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Base Price (₹) *</label>
                <input formControlName="basePrice" type="number" min="1"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none"/>
                @if (isInvalid('basePrice')) { <p class="text-xs text-red-500 mt-1">Required</p> }
              </div>
              <div class="flex items-end gap-3">
                <button type="submit" [disabled]="saving()" class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                  {{ saving() ? 'Saving...' : (editingId() ? 'Update' : 'Create') }}
                </button>
                <button type="button" (click)="cancelForm()" class="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">Loading...</div>
      }

      @if (!loading() && schedules().length === 0 && !showForm()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center py-20 text-center">
          <h3 class="text-base font-semibold text-slate-800 dark:text-white">No schedules yet</h3>
          <button (click)="openForm()" class="mt-5 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">Create First Schedule</button>
        </div>
      }

      @if (!loading() && schedules().length > 0) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-left">
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bus</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Route</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Departure</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-700">
              @for (s of schedules(); track s.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td class="px-6 py-4 font-semibold text-slate-900 dark:text-white">{{ s.busCode }}</td>
                  <td class="px-6 py-4 text-slate-600 dark:text-slate-300">{{ s.routeCode }}</td>
                  <td class="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs">{{ formatDate(s.departureUtc) }}</td>
                  <td class="px-6 py-4 font-semibold text-slate-900 dark:text-white">₹{{ s.basePrice }}</td>
                  <td class="px-6 py-4">
                    @if (s.isCancelledByOperator) {
                      <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Cancelled</span>
                    } @else {
                      <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                    }
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center justify-end gap-2">
                      @if (!s.isCancelledByOperator) {
                        <button (click)="editSchedule(s)" class="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700">Edit</button>
                        <button (click)="cancelSchedule(s)" class="px-3 py-1.5 text-xs font-semibold border border-amber-200 text-amber-600 rounded-xl hover:bg-amber-50">Cancel</button>
                      }
                      <button (click)="deleteSchedule(s.id)" class="px-3 py-1.5 text-xs font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
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
  `,
})
export class ManageSchedulesComponent implements OnInit {
  private schedSvc = inject(ScheduleService);
  private busSvc   = inject(BusService);
  private routeSvc = inject(RouteService);
  private toast    = inject(ToastService);
  private fb       = inject(FormBuilder);

  loading    = signal(true);
  saving     = signal(false);
  showForm   = signal(false);
  editingId  = signal<string | null>(null);
  schedules  = signal<ScheduleResponse[]>([]);
  buses      = signal<BusResponse[]>([]);
  routes     = signal<RouteResponse[]>([]);

  form = this.fb.group({
    busId:          ['', Validators.required],
    routeId:        ['', Validators.required],
    departureUtc:   ['', Validators.required],
    departureLocal: [''],
    basePrice:      [500, [Validators.required, Validators.min(1)]],
  });

  ngOnInit() {
    this.loadSchedules();
    this.busSvc.getAll().subscribe({ next: d => this.buses.set(d), error: () => {} });
    this.routeSvc.getAll().subscribe({ next: d => this.routes.set(d), error: () => {} });
  }

  loadSchedules() {
    this.loading.set(true);
    this.schedSvc.getAll().subscribe({
      next: d => { this.schedules.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm() {
    this.editingId.set(null);
    this.form.reset({ basePrice: 500 });
    this.showForm.set(true);
  }

  editSchedule(s: ScheduleResponse) {
    this.editingId.set(s.id);
    const local = new Date(s.departureUtc).toISOString().slice(0, 16);
    this.form.patchValue({ departureLocal: local, basePrice: s.basePrice });
    this.showForm.set(true);
  }

  cancelForm() { this.showForm.set(false); this.editingId.set(null); }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const v  = this.form.value;
    const id = this.editingId();

    if (id) {
      this.schedSvc.update(id, { departureLocal: v.departureLocal!, timeZoneId: 'UTC', basePrice: +v.basePrice! }).subscribe({
        next: () => { this.toast.success('Schedule updated.'); this.cancelForm(); this.loadSchedules(); this.saving.set(false); },
        error: err => { this.saving.set(false); this.toast.error(err.error?.message ?? 'Update failed.'); },
      });
    } else {
      const dep = new Date(v.departureUtc!).toISOString();
      this.schedSvc.createSchedule({ busId: v.busId!, routeId: v.routeId!, departureUtc: dep, basePrice: +v.basePrice! }).subscribe({
        next: () => { this.toast.success('Schedule created!'); this.cancelForm(); this.loadSchedules(); this.saving.set(false); },
        error: err => { this.saving.set(false); this.toast.error(err.error?.message ?? 'Creation failed.'); },
      });
    }
  }

  cancelSchedule(s: ScheduleResponse) {
    const reason = prompt('Cancellation reason:');
    if (reason === null) return;
    this.schedSvc.cancel(s.id, reason || 'Cancelled by admin').subscribe({
      next: () => { this.toast.success('Schedule cancelled.'); this.loadSchedules(); },
      error: err => this.toast.error(err.error?.message ?? 'Cancel failed.'),
    });
  }

  deleteSchedule(id: string) {
    if (!confirm('Delete this schedule?')) return;
    this.schedSvc.delete(id).subscribe({
      next: () => { this.toast.success('Schedule deleted.'); this.loadSchedules(); },
      error: err => this.toast.error(err.error?.message ?? 'Delete failed.'),
    });
  }

  formatDate(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  isInvalid(f: string) { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }
}
