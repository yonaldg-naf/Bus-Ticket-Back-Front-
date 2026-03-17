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
    <div class="min-h-screen w-full bg-[#0f0f10] px-4 py-10 text-white">

      <div class="max-w-6xl mx-auto">

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <a routerLink="/operator" class="text-[#D32F2F] hover:underline text-sm">← Operator Panel</a>
            <h1 class="text-3xl font-bold mt-1">Manage Schedules</h1>
            <p class="text-gray-400">Create, update, or remove departures.</p>
          </div>
          <button (click)="openForm()"
                  class="py-2 px-4 rounded-xl font-semibold text-white
                         bg-gradient-to-r from-[#D32F2F] to-[#7f1d1d]
                         hover:opacity-90 active:scale-95 transition">
            + Add Schedule
          </button>
        </div>

        <!-- Add/Edit Form -->
        <div *ngIf="showForm()" class="bg-[#161618] border border-[#2a2a2d] rounded-2xl shadow-2xl p-6 mb-6">
          <h3 class="text-xl font-semibold mb-4">
            {{ editingId() ? 'Edit Schedule' : 'Add New Schedule' }}
          </h3>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <!-- Bus Code -->
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Bus Code *</label>
              <input formControlName="busCode"
                     type="text"
                     placeholder="e.g. BUS-001"
                     class="w-full px-4 py-3 rounded-xl bg-[#0f0f10] border border-[#2a2a2d] text-white
                            focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F] outline-none"/>
              <p *ngIf="isInvalid('busCode')" class="text-red-500 text-xs mt-1">Bus code is required</p>
            </div>

            <!-- Route Code -->
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Route Code *</label>
              <input formControlName="routeCode"
                     type="text"
                     placeholder="e.g. MUM-PUN-01"
                     class="w-full px-4 py-3 rounded-xl bg-[#0f0f10] border border-[#2a2a2d] text-white
                            focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F] outline-none"/>
              <p *ngIf="isInvalid('routeCode')" class="text-red-500 text-xs mt-1">Route code is required</p>
            </div>

            <!-- Departure -->
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Departure (Local) *</label>
              <input formControlName="departureLocal"
                     type="datetime-local"
                     class="w-full px-4 py-3 rounded-xl bg-[#0f0f10] border border-[#2a2a2d] text-white
                            focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F] outline-none"/>
              <p *ngIf="isInvalid('departureLocal')" class="text-red-500 text-xs mt-1">Departure time is required</p>
            </div>

            <!-- Base Price -->
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Base Price (₹) *</label>
              <input formControlName="basePrice"
                     type="number" min="0" max="100000"
                     placeholder="e.g. 499"
                     class="w-full px-4 py-3 rounded-xl bg-[#0f0f10] border border-[#2a2a2d] text-white
                            focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F] outline-none"/>
              <p *ngIf="isInvalid('basePrice')" class="text-red-500 text-xs mt-1">Price is required</p>
            </div>

            <!-- Buttons -->
            <div class="sm:col-span-2 flex gap-2 pt-2">
              <button type="submit"
                      [disabled]="saving()"
                      class="flex-1 py-3 rounded-xl font-semibold text-white
                             bg-gradient-to-r from-[#D32F2F] to-[#7f1d1d]
                             hover:opacity-90 active:scale-95 transition disabled:opacity-50">
                {{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create Schedule') }}
              </button>
              <button type="button" (click)="cancelForm()"
                      class="flex-1 py-3 rounded-xl font-semibold text-white bg-gray-800 hover:bg-gray-700 transition">
                Cancel
              </button>
            </div>

            <!-- Form Error -->
            <div *ngIf="formError()" class="sm:col-span-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {{ formError() }}
            </div>

          </form>
        </div>

        <!-- Loading -->
        <div *ngIf="loading()" class="space-y-3">
          <div *ngFor="let _ of [1,2,3,4]">
            <div class="bg-[#161618] rounded-xl p-4 animate-pulse">
              <div class="h-4 bg-gray-700 rounded w-40 mb-2"></div>
              <div class="h-3 bg-gray-700 rounded w-64"></div>
            </div>
          </div>
        </div>

        <!-- Schedule List -->
        <div class="space-y-3">
          <div *ngFor="let schedule of schedules()"
               class="bg-[#161618] border border-[#2a2a2d] rounded-2xl p-4 hover:bg-gray-900 transition">

            <div class="flex justify-between items-start gap-4">

              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-bold text-white">{{ schedule.busCode }}</span>
                  <span class="text-gray-400 text-xs">{{ schedule.registrationNumber }}</span>
                  <span class="text-gray-400">·</span>
                  <span class="text-gray-400 text-sm">{{ schedule.routeCode }}</span>
                </div>

                <div class="flex items-center gap-3 mt-2 text-sm text-gray-400">
                  <div class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 text-[#D32F2F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {{ formatDateTime(schedule.departureUtc) }}
                  </div>
                  <span>·</span>
                  <span class="font-semibold text-white">₹{{ schedule.basePrice }}</span>
                </div>

                <p class="text-gray-400 text-xs mt-1">Reg: {{ schedule.registrationNumber }}</p>
              </div>

              <div class="flex items-center gap-2">
                <button (click)="editSchedule(schedule)"
                        class="py-2 px-4 rounded-xl font-semibold text-white bg-gray-700 hover:bg-gray-600 transition">
                  Edit
                </button>
                <button (click)="deleteSchedule(schedule.id)"
                        class="py-2 px-4 rounded-xl font-semibold text-white bg-red-700 hover:bg-red-600 transition">
                  Delete
                </button>
              </div>

            </div>
          </div>

          <div *ngIf="!loading() && schedules().length === 0" class="text-center py-16 text-gray-400">
            <div class="text-4xl mb-3">🗓️</div>
            <h3 class="font-semibold text-lg">No schedules created yet</h3>
            <p class="mt-1">Click “Add Schedule” to create your first departure.</p>
          </div>
        </div>

      </div>
    </div>
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
    busCode: ['', [Validators.required, Validators.maxLength(50)]],
    routeCode: ['', [Validators.required, Validators.maxLength(50)]],
    departureLocal: ['', Validators.required],
    basePrice: [0, [Validators.required, Validators.min(0), Validators.max(100000)]],
  });

  ngOnInit(): void { this.loadSchedules(); }

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

    const d = new Date(s.departureUtc);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    this.form.patchValue({
      busCode: s.busCode,
      routeCode: s.routeCode,
      departureLocal: localStr,
      basePrice: s.basePrice,
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
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    this.formError.set('');

    const v = this.form.value;
    const id = this.editingId();
    const username = this.authService.currentUser()?.username ?? '';

    if (id) {
      const departureUtc = new Date(v.departureLocal!).toISOString();
      this.scheduleService.update(id, { departureUtc, basePrice: +v.basePrice! }).subscribe({
        next: () => { this.toast.success('Schedule updated.'); this.cancelForm(); this.loadSchedules(); this.saving.set(false); },
        error: (err) => { this.saving.set(false); this.formError.set(err.error?.message ?? 'Update failed.'); },
      });
    } else {
      const departureLocalISO = new Date(v.departureLocal!).toISOString();
      this.scheduleService.createByKeys({
        operatorUsername: username,
        busCode: v.busCode!,
        routeCode: v.routeCode!,
        departureLocal: departureLocalISO,
        timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
        basePrice: +v.basePrice!,
      }).subscribe({
        next: () => { this.toast.success('Schedule created!'); this.cancelForm(); this.loadSchedules(); this.saving.set(false); },
        error: (err) => { this.saving.set(false); this.formError.set(err.error?.message ?? 'Creation failed. Check bus/route codes.'); },
      });
    }
  }

  deleteSchedule(id: string): void {
    if (!confirm('Delete this schedule?')) return;
    this.scheduleService.delete(id).subscribe({
      next: () => { this.toast.success('Schedule deleted.'); this.loadSchedules(); },
      error: (err) => { this.toast.error(err.error?.message ?? 'Delete failed.'); },
    });
  }

  formatDateTime(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}