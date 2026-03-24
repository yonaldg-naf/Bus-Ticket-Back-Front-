import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../../../services/schedule.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ScheduleResponse } from '../../../models/bus-schedule.models';

@Component({
  selector: 'app-manage-schedules',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-gray-50">

    <!-- Page Header -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <a routerLink="/operator" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 class="text-lg font-bold text-gray-900">Manage Schedules</h1>
            <p class="text-sm text-gray-500">{{ filteredSchedules().length }} of {{ schedules().length }} schedules</p>
          </div>
        </div>
        <button (click)="openForm()" class="btn-primary">+ Add Schedule</button>
      </div>

      <!-- Filters & Sort -->
      <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-4 flex flex-wrap gap-3 items-center">
        <div class="relative flex-1 min-w-[180px]">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input [(ngModel)]="searchQuery" placeholder="Search bus or route code…"
            class="form-input pl-9 py-2 text-sm w-full"/>
        </div>
        <input type="date" [(ngModel)]="filterDate" class="form-input py-2 text-sm w-auto" title="Filter by date"/>
        <select [(ngModel)]="sortBy" class="form-input py-2 text-sm w-auto">
          <option value="">Sort by…</option>
          <option value="dep-asc">Departure ↑</option>
          <option value="dep-desc">Departure ↓</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
        </select>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      <!-- Form -->
      @if (showForm()) {
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="font-semibold text-gray-800">{{ editingId() ? 'Edit Schedule' : 'Add New Schedule' }}</h3>
            <button (click)="cancelForm()" class="text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="p-5">
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="form-label">Bus Code *</label>
                <input formControlName="busCode" type="text" placeholder="e.g. BUS-001" class="form-input"/>
                @if (isInvalid('busCode')) { <p class="form-error">Bus code is required</p> }
              </div>
              <div>
                <label class="form-label">Route Code *</label>
                <input formControlName="routeCode" type="text" placeholder="e.g. MUM-PUN-01" class="form-input"/>
                @if (isInvalid('routeCode')) { <p class="form-error">Route code is required</p> }
              </div>
              <div>
                <label class="form-label">Departure Date & Time *</label>
                <input formControlName="departureLocal" type="datetime-local" class="form-input"/>
                @if (isInvalid('departureLocal')) { <p class="form-error">Departure time is required</p> }
              </div>
              <div>
                <label class="form-label">Base Price (₹) *</label>
                <input formControlName="basePrice" type="number" min="0" placeholder="500" class="form-input"/>
                @if (isInvalid('basePrice')) { <p class="form-error">Valid price is required</p> }
              </div>

              @if (formError()) {
                <div class="sm:col-span-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {{ formError() }}
                </div>
              }

              <div class="sm:col-span-2 flex gap-3 pt-1">
                <button type="submit" [disabled]="saving()" class="btn-primary flex-1 py-3">
                  {{ saving() ? 'Saving…' : (editingId() ? 'Update Schedule' : 'Create Schedule') }}
                </button>
                <button type="button" (click)="cancelForm()" class="btn-secondary flex-1 py-3">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1,2,3]; track $index) {
            <div class="card p-5 animate-pulse">
              <div class="flex justify-between">
                <div class="space-y-2"><div class="h-5 skeleton w-36 rounded"></div><div class="h-4 skeleton w-52 rounded"></div></div>
                <div class="flex gap-2"><div class="h-9 skeleton w-16 rounded-lg"></div><div class="h-9 skeleton w-16 rounded-lg"></div></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty -->
      @if (!loading() && schedules().length === 0 && !showForm()) {
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center text-4xl mb-4">🗓️</div>
          <h3 class="text-lg font-bold text-gray-800">No schedules yet</h3>
          <p class="text-gray-500 mt-1.5 text-sm">Create your first schedule to start accepting bookings.</p>
          <button (click)="openForm()" class="btn-primary mt-5">+ Add First Schedule</button>
        </div>
      }

      <!-- No results after filter -->
      @if (!loading() && schedules().length > 0 && filteredSchedules().length === 0) {
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="text-4xl mb-3">🔍</div>
          <p class="font-semibold text-gray-700">No schedules match your filters</p>
          <p class="text-sm text-gray-400 mt-1">Try adjusting your search or date filter</p>
        </div>
      }

      <!-- Schedule List -->
      @if (!loading() && filteredSchedules().length > 0) {
        <div class="space-y-3">
          @for (s of filteredSchedules(); track s.id) {
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-4 flex-1 min-w-0">
                  <div class="w-11 h-11 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-2xl flex-shrink-0">🗓️</div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-1">
                      <span class="font-bold text-gray-900">{{ s.busCode }}</span>
                      <span class="text-gray-400 text-sm font-mono">{{ s.registrationNumber }}</span>
                      <span class="badge badge-info">{{ s.routeCode }}</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                      <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        {{ formatDateTime(s.departureUtc) }}
                      </span>
                      <span class="text-gray-300">·</span>
                      <span class="font-bold text-green-700 text-base">₹{{ s.basePrice | number:'1.0-0' }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                  <button (click)="editSchedule(s)" class="btn-secondary px-4 py-2 text-sm">Edit</button>
                  <button (click)="deleteSchedule(s.id)"
                    class="px-4 py-2 text-sm font-medium rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

    </div>
  </div>
  `,
})
export class ManageSchedulesComponent implements OnInit {
  private fb              = inject(FormBuilder);
  private scheduleService = inject(ScheduleService);
  private authService     = inject(AuthService);
  private toast           = inject(ToastService);

  loading   = signal(true);
  saving    = signal(false);
  showForm  = signal(false);
  editingId      = signal<string | null>(null);
  editingBusId   = signal<string>('');
  editingRouteId = signal<string>('');
  schedules = signal<ScheduleResponse[]>([]);
  formError = signal('');

  searchQuery = '';
  filterDate  = '';
  sortBy      = '';

  filteredSchedules = computed(() => {
    let list = this.schedules();
    const q = this.searchQuery.toLowerCase();
    if (q) list = list.filter(s => s.busCode.toLowerCase().includes(q) || s.routeCode.toLowerCase().includes(q));
    if (this.filterDate) list = list.filter(s => new Date(s.departureUtc).toISOString().startsWith(this.filterDate));
    if (this.sortBy === 'dep-asc')    list = [...list].sort((a, b) => new Date(a.departureUtc).getTime() - new Date(b.departureUtc).getTime());
    if (this.sortBy === 'dep-desc')   list = [...list].sort((a, b) => new Date(b.departureUtc).getTime() - new Date(a.departureUtc).getTime());
    if (this.sortBy === 'price-asc')  list = [...list].sort((a, b) => a.basePrice - b.basePrice);
    if (this.sortBy === 'price-desc') list = [...list].sort((a, b) => b.basePrice - a.basePrice);
    return list;
  });

  form = this.fb.group({
    busCode:        ['', [Validators.required, Validators.maxLength(50)]],
    routeCode:      ['', [Validators.required, Validators.maxLength(50)]],
    departureLocal: ['', Validators.required],
    basePrice:      [0,  [Validators.required, Validators.min(0), Validators.max(100000)]],
  });

  ngOnInit() { this.loadSchedules(); }

  loadSchedules() {
    this.loading.set(true);
    this.scheduleService.getAll().subscribe({
      next: d => { this.schedules.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm() {
    this.editingId.set(null); this.formError.set('');
    this.form.reset({ basePrice: 0 });
    this.showForm.set(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editSchedule(s: ScheduleResponse) {
    this.editingId.set(s.id);
    this.editingBusId.set(s.busId);
    this.editingRouteId.set(s.routeId);
    this.formError.set('');
    const d = new Date(s.departureUtc);
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    this.form.patchValue({ busCode: s.busCode, routeCode: s.routeCode, departureLocal: local, basePrice: s.basePrice });
    this.showForm.set(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingId.set(null);
    this.editingBusId.set('');
    this.editingRouteId.set('');
    this.formError.set('');
  }

  isInvalid(f: string) { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.formError.set('');
    const v = this.form.value;
    const id = this.editingId();

    if (id) {
      this.scheduleService.update(id, {
        busId:        this.editingBusId(),
        routeId:      this.editingRouteId(),
        departureUtc: new Date(v.departureLocal!).toISOString(),
        basePrice:    +v.basePrice!,
      }).subscribe({
        next:  () => { this.toast.success('Schedule updated.'); this.cancelForm(); this.loadSchedules(); this.saving.set(false); },
        error: err => { this.saving.set(false); this.formError.set(err.error?.message ?? 'Update failed.'); },
      });
    } else {
      this.scheduleService.createByKeys({
        companyName:    this.authService.currentUser()?.companyName,
        busCode:        v.busCode!,
        routeCode:      v.routeCode!,
        departureLocal: new Date(v.departureLocal!).toISOString(),
        timeZoneId:     Intl.DateTimeFormat().resolvedOptions().timeZone,
        basePrice:      +v.basePrice!,
      }).subscribe({
        next:  () => { this.toast.success('Schedule created!'); this.cancelForm(); this.loadSchedules(); this.saving.set(false); },
        error: err => { this.saving.set(false); this.formError.set(err.error?.message ?? 'Creation failed. Check bus/route codes.'); },
      });
    }
  }

  deleteSchedule(id: string) {
    if (!confirm('Delete this schedule? This cannot be undone.')) return;
    this.scheduleService.delete(id).subscribe({
      next:  () => { this.toast.success('Schedule deleted.'); this.loadSchedules(); },
      error: err => this.toast.error(err.error?.message ?? 'Delete failed.'),
    });
  }

  formatDateTime(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}