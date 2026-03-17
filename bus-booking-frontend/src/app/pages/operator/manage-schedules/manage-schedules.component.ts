import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ScheduleService } from '../../../services/schedule.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ScheduleResponse } from '../../../models/bus-schedule.models';

@Component({
  selector: 'app-manage-schedules',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="container max-w-6xl pt-10">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <a routerLink="/operator" class="text-sm text-[var(--accent)] hover:underline">← Operator Panel</a>
          <h1 class="text-2xl font-extrabold tracking-tight mt-1">Manage Schedules</h1>
          <p class="text-muted">Create, update, or remove departures.</p>
        </div>
        <button (click)="openForm()" class="btn btn-primary h-9 px-4">
          + Add Schedule
        </button>
      </div>

      <!-- Add/Edit Form -->
      @if (showForm()) {
        <div class="card mb-6">
          <div class="card-body">
            <h3 class="font-semibold text-lg mb-4">
              {{ editingId() ? 'Edit Schedule' : 'Add New Schedule' }}
            </h3>

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="label">Bus Code *</label>
                <input
                  formControlName="busCode"
                  type="text"
                  placeholder="e.g. BUS-001"
                  class="input"
                  [class.border-red-300]="isInvalid('busCode')"
                />
                @if (isInvalid('busCode')) {
                  <p class="mt-1 text-xs text-red-600">Bus code is required</p>
                }
              </div>

              <div>
                <label class="label">Route Code *</label>
                <input
                  formControlName="routeCode"
                  type="text"
                  placeholder="e.g. MUM-PUN-01"
                  class="input"
                  [class.border-red-300]="isInvalid('routeCode')"
                />
                @if (isInvalid('routeCode')) {
                  <p class="mt-1 text-xs text-red-600">Route code is required</p>
                }
              </div>

              <div>
                <label class="label">Departure (Local) *</label>
                <input
                  formControlName="departureLocal"
                  type="datetime-local"
                  class="input"
                  [class.border-red-300]="isInvalid('departureLocal')"
                />
                @if (isInvalid('departureLocal')) {
                  <p class="mt-1 text-xs text-red-600">Departure time is required</p>
                }
              </div>

              <div>
                <label class="label">Base Price (₹) *</label>
                <input
                  formControlName="basePrice"
                  type="number"
                  min="0"
                  max="100000"
                  placeholder="e.g. 499"
                  class="input"
                  [class.border-red-300]="isInvalid('basePrice')"
                />
                @if (isInvalid('basePrice')) {
                  <p class="mt-1 text-xs text-red-600">Price is required</p>
                }
              </div>

              <div class="sm:col-span-2 flex gap-2 pt-2">
                <button type="submit" [disabled]="saving()" class="btn btn-primary flex-1">
                  {{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create Schedule') }}
                </button>
                <button type="button" (click)="cancelForm()" class="btn btn-ghost flex-1">
                  Cancel
                </button>
              </div>

              @if (formError()) {
                <div class="sm:col-span-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {{ formError() }}
                </div>
              }
            </form>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1,2,3,4]; track $index) {
            <div class="card">
              <div class="card-body animate-pulse">
                <div class="h-4 bg-[#efefef] rounded w-40 mb-2"></div>
                <div class="h-3 bg-[#f4f4f4] rounded w-64"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Schedule list -->
      <div class="space-y-3">
        @for (s of schedules(); track s.id) {
          <div class="card hover:card-soft transition">
            <div class="card-body">
              <div class="flex items-start justify-between gap-4">
                <!-- Left -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-lg">{{ s.busCode }}</span>
                    <span class="badge badge-neutral">{{ s.registrationNumber }}</span>
                    <span class="text-muted">·</span>
                    <span class="text-sm text-[var(--graphite)]">{{ s.routeCode }}</span>
                  </div>

                  <div class="flex items-center gap-3 mt-2 text-sm text-[var(--graphite)]">
                    <div class="flex items-center gap-1">
                      <svg class="w-3.5 h-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {{ formatDateTime(s.departureUtc) }}
                    </div>
                    <span class="text-muted">·</span>
                    <span class="font-semibold">₹{{ s.basePrice }}</span>
                  </div>

                  <p class="text-xs text-muted mt-1">Reg: {{ s.registrationNumber }}</p>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 flex-shrink-0">
                  <button (click)="editSchedule(s)" class="btn btn-secondary h-9">Edit</button>
                  <button
                    (click)="deleteSchedule(s.id)"
                    class="btn btn-ghost h-9 border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        }

        @if (!loading() && schedules().length === 0) {
          <div class="text-center py-16">
            <div class="text-4xl mb-3">🗓️</div>
            <h3 class="font-semibold text-lg">No schedules created yet</h3>
            <p class="text-muted mt-1">Click “Add Schedule” to create your first departure.</p>
          </div>
        }
      </div>
    </section>
  `,
})
export class ManageSchedulesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private scheduleService = inject(ScheduleService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  schedules = signal<ScheduleResponse[]>([]);
  formError = signal('');

  form = this.fb.group({
    busCode:        ['', [Validators.required, Validators.maxLength(50)]],
    routeCode:      ['', [Validators.required, Validators.maxLength(50)]],
    departureLocal: ['', Validators.required],  // datetime-local
    basePrice:      [0,  [Validators.required, Validators.min(0), Validators.max(100000)]],
  });

  ngOnInit(): void {
    this.loadSchedules();
  }

  loadSchedules(): void {
    this.loading.set(true);
    this.scheduleService.getAll().subscribe({
      next: (data) => { this.schedules.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(): void {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({ basePrice: 0 });
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editSchedule(s: ScheduleResponse): void {
    this.editingId.set(s.id);
    this.formError.set('');

    // Convert UTC → local for datetime-local input
    const d = new Date(s.departureUtc);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    this.form.patchValue({
      busCode:        s.busCode,
      routeCode:      s.routeCode,
      departureLocal: localStr,
      basePrice:      s.basePrice,
    });

    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.formError.set('');
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set('');

    const v = this.form.value;
    const id = this.editingId();
    const username = this.authService.currentUser()?.username ?? '';

    if (id) {
      // Update by ID requires UTC
      const departureUtc = new Date(v.departureLocal!).toISOString();
      this.scheduleService.update(id, {
        departureUtc,
        basePrice: +v.basePrice!,
      }).subscribe({
        next: () => {
          this.toast.success('Schedule updated.');
          this.cancelForm();
          this.loadSchedules();
          this.saving.set(false);
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(err.error?.message ?? 'Update failed.');
        },
      });
    } else {
      // Create by keys (local + timeZoneId) is safest for date handling
      const departureLocalISO = new Date(v.departureLocal!).toISOString();
      this.scheduleService.createByKeys({
        operatorUsername: username,
        busCode:   v.busCode!,
        routeCode: v.routeCode!,
        departureLocal: departureLocalISO,
        timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
        basePrice: +v.basePrice!,
      }).subscribe({
        next: () => {
          this.toast.success('Schedule created!');
          this.cancelForm();
          this.loadSchedules();
          this.saving.set(false);
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(err.error?.message ?? 'Creation failed. Check bus/route codes.');
        },
      });
    }
  }

  deleteSchedule(id: string): void {
    if (!confirm('Delete this schedule?')) return;
    this.scheduleService.delete(id).subscribe({
      next: () => { this.toast.success('Schedule deleted.'); this.loadSchedules(); },
      error: (err) => this.toast.error(err.error?.message ?? 'Delete failed.'),
    });
  }

  formatDateTime(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
