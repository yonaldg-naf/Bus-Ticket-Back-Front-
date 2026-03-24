import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BusService } from '../../../services/bus-route.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { BusResponse, BusType, BusStatus, CreateBusByOperatorRequest, UpdateBusRequest } from '../../../services/bus-route.service';

@Component({
  selector: 'app-manage-buses',
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
            <h1 class="text-lg font-bold text-gray-900">Manage Buses</h1>
            <p class="text-sm text-gray-500">{{ filteredBuses().length }} of {{ buses().length }} buses</p>
          </div>
        </div>
        <button (click)="openForm()" class="btn-primary">+ Add Bus</button>
      </div>

      <!-- Filters & Sort -->
      <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-4 flex flex-wrap gap-3 items-center">
        <div class="relative flex-1 min-w-[180px]">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input [(ngModel)]="searchQuery" placeholder="Search code or registration…"
            class="form-input pl-9 py-2 text-sm w-full"/>
        </div>
        <select [(ngModel)]="filterType" class="form-input py-2 text-sm w-auto">
          <option value="">All Types</option>
          <option value="1">Seater</option>
          <option value="2">Semi Sleeper</option>
          <option value="3">Sleeper</option>
          <option value="4">AC</option>
          <option value="5">Non-AC</option>
        </select>
        <select [(ngModel)]="filterStatus" class="form-input py-2 text-sm w-auto">
          <option value="">All Status</option>
          <option value="1">Available</option>
          <option value="2">Under Repair</option>
          <option value="3">Not Available</option>
        </select>
        <select [(ngModel)]="sortBy" class="form-input py-2 text-sm w-auto">
          <option value="">Sort by…</option>
          <option value="code">Code A–Z</option>
          <option value="seats-asc">Seats ↑</option>
          <option value="seats-desc">Seats ↓</option>
          <option value="status">Status</option>
        </select>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      <!-- Add / Edit Form -->
      @if (showForm()) {
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="font-semibold text-gray-800">{{ editingId() ? 'Edit Bus' : 'Add New Bus' }}</h3>
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
                <input formControlName="code" type="text" placeholder="BUS-001" class="form-input"
                  [class.opacity-50]="editingId()" [attr.title]="editingId() ? 'Bus code cannot be changed after creation' : null"/>
                @if (editingId()) {
                  <p class="text-xs text-gray-400 mt-1">Bus code cannot be changed after creation</p>
                }
                @if (isInvalid('code')) { <p class="form-error">Code is required</p> }
              </div>
              <div>
                <label class="form-label">Registration Number *</label>
                <input formControlName="registrationNumber" type="text" placeholder="MH12AB1234" class="form-input"/>
                @if (isInvalid('registrationNumber')) { <p class="form-error">Registration is required</p> }
              </div>
              <div>
                <label class="form-label">Bus Type *</label>
                <select formControlName="busType" class="form-input">
                  <option [value]="1">Seater</option>
                  <option [value]="2">Semi Sleeper</option>
                  <option [value]="3">Sleeper</option>
                  <option [value]="4">AC</option>
                  <option [value]="5">Non-AC</option>
                </select>
              </div>
              <div>
                <label class="form-label">Total Seats *</label>
                <input formControlName="totalSeats" type="number" min="1" max="100" class="form-input"/>
                @if (isInvalid('totalSeats')) { <p class="form-error">Seats must be 1–100</p> }
              </div>
              <div>
                <label class="form-label">Status</label>
                <select formControlName="status" class="form-input">
                  <option [value]="1">✅ Available</option>
                  <option [value]="2">🔧 Under Repair</option>
                  <option [value]="3">❌ Not Available</option>
                </select>
              </div>
              <div class="sm:col-span-2 flex gap-3 pt-2">
                <button type="submit" [disabled]="saving()" class="btn-primary flex-1 py-3">
                  {{ saving() ? 'Saving…' : (editingId() ? 'Update Bus' : 'Add Bus') }}
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
                <div class="space-y-2"><div class="h-5 skeleton w-32 rounded"></div><div class="h-4 skeleton w-56 rounded"></div></div>
                <div class="flex gap-2"><div class="h-9 skeleton w-16 rounded-lg"></div><div class="h-9 skeleton w-16 rounded-lg"></div></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty -->
      @if (!loading() && buses().length === 0 && !showForm()) {
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center text-4xl mb-4">🚌</div>
          <h3 class="text-lg font-bold text-gray-800">No buses yet</h3>
          <p class="text-gray-500 mt-1.5 text-sm">Add your first bus to start accepting bookings.</p>
          <button (click)="openForm()" class="btn-primary mt-5">+ Add First Bus</button>
        </div>
      }

      <!-- No results after filter -->
      @if (!loading() && buses().length > 0 && filteredBuses().length === 0) {
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="text-4xl mb-3">🔍</div>
          <p class="font-semibold text-gray-700">No buses match your filters</p>
          <p class="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
      }

      <!-- Bus List -->
      @if (!loading() && filteredBuses().length > 0) {
        <div class="space-y-3">
          @for (bus of filteredBuses(); track bus.id) {
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-4 flex-1 min-w-0">
                  <div class="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-2xl flex-shrink-0">🚌</div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-gray-900">{{ bus.code }}</span>
                      <span class="font-mono text-xs text-gray-500">{{ bus.registrationNumber }}</span>
                      <span class="badge" [class]="statusBadge(bus.status)">{{ busStatusLabel(bus.status) }}</span>
                    </div>
                    <div class="flex items-center gap-3 mt-1.5 text-sm text-gray-500 flex-wrap">
                      <span>{{ busTypeLabel(bus.busType) }}</span>
                      <span class="text-gray-300">·</span>
                      <span>{{ bus.totalSeats }} seats</span>
                    </div>
                  </div>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                  <button (click)="editBus(bus)" class="btn-secondary px-4 py-2 text-sm">Edit</button>
                  <button (click)="deleteBus(bus.id)"
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
export class ManageBusesComponent implements OnInit {
  private fb          = inject(FormBuilder);
  private busService  = inject(BusService);
  private authService = inject(AuthService);
  private toast       = inject(ToastService);

  loading   = signal(true);
  saving    = signal(false);
  showForm  = signal(false);
  editingId = signal<string | null>(null);
  buses     = signal<BusResponse[]>([]);

  searchQuery  = '';
  filterType   = '';
  filterStatus = '';
  sortBy       = '';

  filteredBuses = computed(() => {
    let list = this.buses();
    const q = this.searchQuery.toLowerCase();
    if (q) list = list.filter(b => b.code.toLowerCase().includes(q) || b.registrationNumber.toLowerCase().includes(q));
    if (this.filterType)   list = list.filter(b => String(b.busType) === this.filterType);
    if (this.filterStatus) list = list.filter(b => String(b.status) === this.filterStatus);
    if (this.sortBy === 'code')       list = [...list].sort((a, b) => a.code.localeCompare(b.code));
    if (this.sortBy === 'seats-asc')  list = [...list].sort((a, b) => a.totalSeats - b.totalSeats);
    if (this.sortBy === 'seats-desc') list = [...list].sort((a, b) => b.totalSeats - a.totalSeats);
    if (this.sortBy === 'status')     list = [...list].sort((a, b) => a.status - b.status);
    return list;
  });

  form = this.fb.group({
    code:               ['', [Validators.required, Validators.maxLength(50)]],
    registrationNumber: ['', [Validators.required, Validators.maxLength(50)]],
    busType:            [BusType.Seater, Validators.required],
    totalSeats:         [40, [Validators.required, Validators.min(1), Validators.max(100)]],
    status:             [BusStatus.Available],
  });

  ngOnInit() { this.loadBuses(); }

  isInvalid(f: string) { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }

  loadBuses() {
    this.loading.set(true);
    this.busService.getAll().subscribe({
      next: d => { this.buses.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm() {
    this.editingId.set(null);
    this.form.get('code')?.enable();
    this.form.reset({ busType: BusType.Seater, totalSeats: 40, status: BusStatus.Available });
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editBus(bus: BusResponse) {
    this.editingId.set(bus.id);
    this.form.patchValue({ code: bus.code, registrationNumber: bus.registrationNumber, busType: bus.busType, totalSeats: bus.totalSeats, status: bus.status });
    this.form.get('code')?.disable();
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.get('code')?.enable();
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.form.value;
    const id = this.editingId();

    if (id) {
      const dto: UpdateBusRequest = { registrationNumber: v.registrationNumber!, busType: +v.busType!, totalSeats: +v.totalSeats!, status: +v.status! };
      this.busService.update(id, dto).subscribe({
        next: () => { this.toast.success('Bus updated.'); this.cancelForm(); this.loadBuses(); this.saving.set(false); },
        error: err => { this.saving.set(false); this.toast.error(err.error?.message ?? 'Update failed.'); },
      });
    } else {
      const dto: CreateBusByOperatorRequest = {
        operatorUsername: this.authService.currentUser()?.username ?? '',
        code: v.code!, registrationNumber: v.registrationNumber!,
        busType: +v.busType!, totalSeats: +v.totalSeats!, status: +v.status!,
      };
      this.busService.createByOperator(dto).subscribe({
        next: () => { this.toast.success('Bus added!'); this.cancelForm(); this.loadBuses(); this.saving.set(false); },
        error: err => { this.saving.set(false); this.toast.error(err.error?.message ?? 'Creation failed.'); },
      });
    }
  }

  deleteBus(id: string) {
    if (!confirm('Delete this bus? This cannot be undone.')) return;
    this.busService.delete(id).subscribe({
      next:  () => { this.toast.success('Bus deleted.'); this.loadBuses(); },
      error: err => this.toast.error(err.error?.message ?? 'Delete failed.'),
    });
  }

  busTypeLabel(t: number): string { return ({1:'Seater',2:'Semi Sleeper',3:'Sleeper',4:'AC',5:'Non-AC'} as any)[t] ?? 'Unknown'; }
  busStatusLabel(s: number): string { return ({1:'Available',2:'Under Repair',3:'Not Available'} as any)[s] ?? 'Unknown'; }
  statusBadge(s: number): string {
    return ({1:'badge badge-success', 2:'badge badge-warning', 3:'badge badge-error'} as any)[s] ?? 'badge badge-gray';
  }
}
