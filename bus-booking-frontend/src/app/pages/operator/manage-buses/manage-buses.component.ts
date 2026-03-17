import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BusService } from '../../../services/bus-route.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import {
  BusResponse, BusType, BusStatus, CreateBusByOperatorRequest, UpdateBusRequest
} from '../../../services/bus-route.service';

@Component({
  selector: 'app-manage-buses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="min-h-screen w-full bg-[#121212] text-white py-10 px-4 flex justify-center">
      <div class="w-full max-w-6xl space-y-6">

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <a routerLink="/operator" class="text-sm text-indigo-400 hover:underline">← Operator Panel</a>
            <h1 class="text-2xl font-extrabold tracking-tight mt-1">Manage Buses</h1>
            <p class="text-gray-400">Add, edit and manage your fleet.</p>
          </div>
          <button (click)="openForm()" class="btn btn-primary h-9 px-4">+ Add Bus</button>
        </div>

        <!-- Add/Edit Form -->
        @if (showForm()) {
          <div class="card bg-gray-800 border border-gray-700 mb-6">
            <div class="card-body">
              <h3 class="font-semibold text-lg mb-4">{{ editingId() ? 'Edit Bus' : 'Add New Bus' }}</h3>
              <form [formGroup]="form" (ngSubmit)="onSubmit()" class="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label class="label">Bus Code *</label>
                  <input formControlName="code" type="text" placeholder="e.g. BUS-001" class="input bg-gray-700 text-white"/>
                  @if (isInvalid('code')) {
                    <p class="text-xs text-red-500 mt-1">Code is required (max 50 chars)</p>
                  }
                </div>

                <div>
                  <label class="label">Registration No *</label>
                  <input formControlName="registrationNumber" type="text" placeholder="e.g. MH12AB1234" class="input bg-gray-700 text-white"/>
                  @if (isInvalid('registrationNumber')) {
                    <p class="text-xs text-red-500 mt-1">Registration is required (max 50 chars)</p>
                  }
                </div>

                <div>
                  <label class="label">Bus Type *</label>
                  <select formControlName="busType" class="input bg-gray-700 text-white">
                    <option [value]="1">Seater</option>
                    <option [value]="2">Semi Sleeper</option>
                    <option [value]="3">Sleeper</option>
                    <option [value]="4">AC</option>
                    <option [value]="5">Non-AC</option>
                  </select>
                </div>

                <div>
                  <label class="label">Total Seats *</label>
                  <input formControlName="totalSeats" type="number" min="1" max="100" placeholder="40" class="input bg-gray-700 text-white"/>
                  @if (isInvalid('totalSeats')) {
                    <p class="text-xs text-red-500 mt-1">Seats must be between 1 and 100</p>
                  }
                </div>

                <div>
                  <label class="label">Status</label>
                  <select formControlName="status" class="input bg-gray-700 text-white">
                    <option [value]="1">Available</option>
                    <option [value]="2">Under Repair</option>
                    <option [value]="3">Not Available</option>
                  </select>
                </div>

                <div class="sm:col-span-2 flex gap-2 pt-2">
                  <button type="button" class="btn btn-ghost flex-1" (click)="cancelForm()">Cancel</button>
                  <button type="submit" [disabled]="saving()" class="btn btn-primary flex-1">
                    {{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Add Bus') }}
                  </button>
                </div>

              </form>
            </div>
          </div>
        }

        <!-- Loading skeleton -->
        @if (loading()) {
          <div class="space-y-3">
            @for (_ of [1,2,3,4]; track $index) {
              <div class="card bg-gray-800 border border-gray-700 animate-pulse">
                <div class="card-body">
                  <div class="h-4 bg-gray-600 rounded w-40 mb-2"></div>
                  <div class="h-3 bg-gray-600 rounded w-64"></div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Bus List -->
        <div class="space-y-3">
          @for (bus of buses(); track bus.id) {
            <div class="card bg-gray-800 border border-gray-700 hover:bg-gray-700 transition">
              <div class="card-body flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-lg">{{ bus.code }}</span>
                    <span class="badge badge-neutral">{{ bus.registrationNumber }}</span>
                    <span class="badge badge-accent">{{ busTypeLabel(bus.busType) }}</span>
                    <span class="badge" [ngClass]="statusBadge(bus.status)">{{ busStatusLabel(bus.status) }}</span>
                  </div>
                  <p class="text-sm text-gray-400 mt-1">Seats: {{ bus.totalSeats }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <button class="btn btn-secondary h-9" (click)="editBus(bus)">Edit</button>
                  <button class="btn btn-ghost h-9 border border-red-600 text-red-400 hover:bg-red-700 hover:text-white"
                          (click)="deleteBus(bus.id)">Delete</button>
                </div>
              </div>
            </div>
          }

          @if (!loading() && buses().length === 0) {
            <div class="text-center py-16">
              <div class="text-4xl mb-3">🚌</div>
              <h3 class="font-semibold text-lg">No buses added yet</h3>
              <p class="text-gray-400 mt-1">Click “Add Bus” to create your first bus.</p>
            </div>
          }
        </div>

      </div>
    </section>
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
    this.form.reset({ busType: BusType.Seater, totalSeats: 40, status: BusStatus.Available });
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

  cancelForm(): void { this.showForm.set(false); this.editingId.set(null); }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
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
        next: () => { this.toast.success('Bus updated.'); this.cancelForm(); this.loadBuses(); this.saving.set(false); },
        error: (err) => { this.saving.set(false); this.toast.error(err.error?.message ?? 'Update failed.'); },
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
        next: () => { this.toast.success('Bus added!'); this.cancelForm(); this.loadBuses(); this.saving.set(false); },
        error: (err) => { this.saving.set(false); this.toast.error(err.error?.message ?? 'Creation failed.'); },
      });
    }
  }

  // Labels / badges
  busTypeLabel(t: number): string { return {1:'Seater',2:'Semi Sleeper',3:'Sleeper',4:'AC',5:'Non-AC'}[t] ?? 'Unknown'; }
  busStatusLabel(s: number): string { return {1:'Available',2:'Under Repair',3:'Not Available'}[s] ?? 'Unknown'; }
  statusBadge(s: number): string { return {1:'badge-success',2:'badge-accent',3:'badge-error'}[s] ?? 'badge-neutral'; }

  deleteBus(id: string): void {
    if (!confirm('Delete this bus?')) return;
    this.busService.delete(id).subscribe({
      next: () => { this.toast.success('Bus deleted.'); this.loadBuses(); },
      error: (err) => this.toast.error(err.error?.message ?? 'Delete failed.'),
    });
  }
}