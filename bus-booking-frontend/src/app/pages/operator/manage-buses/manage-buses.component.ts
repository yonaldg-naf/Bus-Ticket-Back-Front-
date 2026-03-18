import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { BusService } from '../../../services/bus-route.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

import {
  BusResponse,
  BusType,
  BusStatus,
  CreateBusByOperatorRequest,
  UpdateBusRequest
} from '../../../services/bus-route.service';

@Component({
  selector: 'app-manage-buses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
  <div class="min-h-screen w-full bg-[#0f0f10] px-4 py-10 text-white">

    <div class="max-w-6xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <a routerLink="/operator" class="text-[#D32F2F] hover:underline text-sm">← Operator Panel</a>
          <h1 class="text-3xl font-bold mt-1">Manage Buses</h1>
          <p class="text-gray-400">Add, edit and manage your fleet.</p>
        </div>

        <button (click)="openForm()"
          class="py-2 px-4 rounded-xl font-semibold text-white
                 bg-gradient-to-r from-[#D32F2F] to-[#7f1d1d]
                 hover:opacity-90 active:scale-95 transition">
          + Add Bus
        </button>
      </div>

      <!-- Form -->
      <div *ngIf="showForm()" class="bg-[#161618] border border-[#2a2a2d] rounded-2xl shadow-2xl p-6 mb-6">

        <h3 class="text-xl font-semibold mb-4">
          {{ editingId() ? 'Edit Bus' : 'Add New Bus' }}
        </h3>

        <form [formGroup]="form" (ngSubmit)="onSubmit()"
              class="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <!-- Code -->
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Bus Code *</label>
            <input formControlName="code"
              type="text"
              placeholder="BUS-001"
              class="w-full px-4 py-3 rounded-xl bg-[#0f0f10] border border-[#2a2a2d] text-white
                     focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F] outline-none"/>
            <p *ngIf="isInvalid('code')" class="text-red-500 text-xs mt-1">
              Code is required
            </p>
          </div>

          <!-- Registration -->
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Registration *</label>
            <input formControlName="registrationNumber"
              type="text"
              placeholder="MH12AB1234"
              class="w-full px-4 py-3 rounded-xl bg-[#0f0f10] border border-[#2a2a2d] text-white
                     focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F] outline-none"/>
            <p *ngIf="isInvalid('registrationNumber')" class="text-red-500 text-xs mt-1">
              Registration is required
            </p>
          </div>

          <!-- Bus Type -->
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Bus Type *</label>
            <select formControlName="busType"
              class="w-full px-4 py-3 rounded-xl bg-[#0f0f10] border border-[#2a2a2d] text-white
                     focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F] outline-none">
              <option [value]="1">Seater</option>
              <option [value]="2">Semi Sleeper</option>
              <option [value]="3">Sleeper</option>
              <option [value]="4">AC</option>
              <option [value]="5">Non-AC</option>
            </select>
          </div>

          <!-- Seats -->
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Seats *</label>
            <input formControlName="totalSeats"
              type="number" min="1" max="100"
              class="w-full px-4 py-3 rounded-xl bg-[#0f0f10] border border-[#2a2a2d] text-white
                     focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F] outline-none"/>
            <p *ngIf="isInvalid('totalSeats')" class="text-red-500 text-xs mt-1">
              Seats must be between 1–100
            </p>
          </div>

          <!-- Status -->
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Status</label>
            <select formControlName="status"
              class="w-full px-4 py-3 rounded-xl bg-[#0f0f10] border border-[#2a2a2d] text-white
                     focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F] outline-none">
              <option [value]="1">Available</option>
              <option [value]="2">Under Repair</option>
              <option [value]="3">Not Available</option>
            </select>
          </div>

          <!-- Buttons -->
          <div class="sm:col-span-2 flex gap-2 pt-2">
            <button type="submit"
              [disabled]="saving()"
              class="flex-1 py-3 rounded-xl font-semibold text-white
                     bg-gradient-to-r from-[#D32F2F] to-[#7f1d1d]
                     hover:opacity-90 active:scale-95 transition disabled:opacity-50">
              {{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Add Bus') }}
            </button>

            <button type="button" (click)="cancelForm()"
              class="flex-1 py-3 rounded-xl font-semibold text-white bg-gray-800 hover:bg-gray-700 transition">
              Cancel
            </button>
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

      <!-- Bus List -->
      <div class="space-y-3">

        <div *ngFor="let bus of buses()"
          class="bg-[#161618] border border-[#2a2a2d] rounded-2xl p-4 hover:bg-gray-900 transition">

          <div class="flex justify-between items-start gap-4">

            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-bold text-white">{{ bus.code }}</span>
                <span class="text-gray-400 text-xs">{{ bus.registrationNumber }}</span>
                <span class="text-gray-400">·</span>
                <span class="text-gray-400 text-sm">{{ busTypeLabel(bus.busType) }}</span>
                <span class="text-gray-400 text-sm">· {{ busStatusLabel(bus.status) }}</span>
              </div>

              <p class="text-gray-400 text-sm mt-2">
                Seats: <span class="text-white font-semibold">{{ bus.totalSeats }}</span>
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button (click)="editBus(bus)"
                class="py-2 px-4 rounded-xl font-semibold text-white bg-gray-700 hover:bg-gray-600 transition">
                Edit
              </button>

              <button (click)="deleteBus(bus.id)"
                class="py-2 px-4 rounded-xl font-semibold text-white bg-red-700 hover:bg-red-600 transition">
                Delete
              </button>
            </div>

          </div>
        </div>

        <!-- Empty -->
        <div *ngIf="!loading() && buses().length === 0"
             class="text-center py-16 text-gray-400">
          <div class="text-4xl mb-3">🚌</div>
          <h3 class="font-semibold text-lg">No buses added yet</h3>
          <p class="mt-1">Click “Add Bus” to create your first bus.</p>
        </div>

      </div>

    </div>
  </div>
  `,
})
export class ManageBusesComponent implements OnInit {

  private fb = inject(FormBuilder);
  private busService = inject(BusService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  buses = signal<BusResponse[]>([]);

  form = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    registrationNumber: ['', [Validators.required, Validators.maxLength(50)]],
    busType: [BusType.Seater, Validators.required],
    totalSeats: [40, [Validators.required, Validators.min(1), Validators.max(100)]],
    status: [BusStatus.Available],
  });

  ngOnInit(): void { this.loadBuses(); }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  loadBuses(): void {
    this.loading.set(true);
    this.busService.getAll().subscribe({
      next: (data) => { this.buses.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(): void {
    this.editingId.set(null);
    this.form.reset({
      busType: BusType.Seater,
      totalSeats: 40,
      status: BusStatus.Available
    });
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editBus(bus: BusResponse): void {
    this.editingId.set(bus.id);
    this.form.patchValue({
      code: bus.code,
      registrationNumber: bus.registrationNumber,
      busType: bus.busType,
      totalSeats: bus.totalSeats,
      status: bus.status,
    });
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const v = this.form.value;
    const id = this.editingId();

    if (id) {
      const dto: UpdateBusRequest = {
        registrationNumber: v.registrationNumber!,
        busType: +v.busType!,
        totalSeats: +v.totalSeats!,
        status: +v.status!,
      };

      this.busService.update(id, dto).subscribe({
        next: () => {
          this.toast.success('Bus updated.');
          this.cancelForm();
          this.loadBuses();
          this.saving.set(false);
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(err.error?.message ?? 'Update failed.');
        },
      });

    } else {
      const dto: CreateBusByOperatorRequest = {
        operatorUsername: this.authService.currentUser()?.username ?? '',
        code: v.code!,
        registrationNumber: v.registrationNumber!,
        busType: +v.busType!,
        totalSeats: +v.totalSeats!,
        status: +v.status!,
      };

      this.busService.createByOperator(dto).subscribe({
        next: () => {
          this.toast.success('Bus added!');
          this.cancelForm();
          this.loadBuses();
          this.saving.set(false);
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(err.error?.message ?? 'Creation failed.');
        },
      });
    }
  }

  deleteBus(id: string): void {
    if (!confirm('Delete this bus?')) return;

    this.busService.delete(id).subscribe({
      next: () => {
        this.toast.success('Bus deleted.');
        this.loadBuses();
      },
      error: (err) => {
        this.toast.error(err.error?.message ?? 'Delete failed.');
      },
    });
  }

  busTypeLabel(t: number): string {
    return {1:'Seater',2:'Semi Sleeper',3:'Sleeper',4:'AC',5:'Non-AC'}[t] ?? 'Unknown';
  }

  busStatusLabel(s: number): string {
    return {1:'Available',2:'Under Repair',3:'Not Available'}[s] ?? 'Unknown';
  }
}