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
  <div class="min-h-screen bg-slate-50">

    <!-- Top Bar -->
    <div class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <a routerLink="/operator" class="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 class="text-xl font-semibold text-slate-900">Fleet Management</h1>
            <p class="text-sm text-slate-500 mt-0.5">{{ buses().length }} buses registered</p>
          </div>
        </div>
        <button (click)="openForm()"
          class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add Bus
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-6 py-6 space-y-5">

      <!-- Filters Row -->
      <div class="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <div class="flex flex-wrap gap-3 items-center">
          <div class="relative flex-1 min-w-[200px]">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input [(ngModel)]="searchQuery" placeholder="Search by code or registration…"
              class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
          </div>
          <select [(ngModel)]="filterType"
            class="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors">
            <option value="">All Types</option>
            <option value="1">Seater</option>
            <option value="2">Semi Sleeper</option>
            <option value="3">Sleeper</option>
            <option value="4">AC</option>
            <option value="5">Non-AC</option>
          </select>
          <select [(ngModel)]="filterStatus"
            class="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors">
            <option value="">All Status</option>
            <option value="1">Available</option>
            <option value="2">Under Repair</option>
            <option value="3">Not Available</option>
          </select>
          <select [(ngModel)]="sortBy"
            class="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors">
            <option value="">Sort by…</option>
            <option value="code">Code A–Z</option>
            <option value="seats-asc">Seats (Low–High)</option>
            <option value="seats-desc">Seats (High–Low)</option>
            <option value="status">Status</option>
          </select>
          <span class="text-sm text-slate-500 ml-auto">{{ filteredBuses().length }} result{{ filteredBuses().length !== 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- Add / Edit Form -->
      @if (showForm()) {
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 class="font-semibold text-slate-900">{{ editingId() ? 'Edit Bus Details' : 'Register New Bus' }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">{{ editingId() ? 'Update the bus information below' : 'Fill in the details to add a bus to your fleet' }}</p>
            </div>
            <button (click)="cancelForm()" class="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="p-6">
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Bus Code *</label>
                <input formControlName="code" type="text" placeholder="BUS-001"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"
                  [class.opacity-60]="editingId()" [class.bg-slate-50]="editingId()"/>
                @if (editingId()) {
                  <p class="text-xs text-slate-400 mt-1">Code cannot be changed after creation</p>
                }
                @if (isInvalid('code')) { <p class="text-xs text-red-500 mt-1">Bus code is required</p> }
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Registration Number *</label>
                <input formControlName="registrationNumber" type="text" placeholder="MH12AB1234"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
                @if (isInvalid('registrationNumber')) { <p class="text-xs text-red-500 mt-1">Registration is required</p> }
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Bus Type *</label>
                <select formControlName="busType"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors">
                  <option [value]="1">Seater</option>
                  <option [value]="2">Semi Sleeper</option>
                  <option [value]="3">Sleeper</option>
                  <option [value]="4">AC</option>
                  <option [value]="5">Non-AC</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Total Seats *</label>
                <input formControlName="totalSeats" type="number" min="1" max="100"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
                @if (isInvalid('totalSeats')) { <p class="text-xs text-red-500 mt-1">Seats must be 1–100</p> }
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Status</label>
                <select formControlName="status"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors">
                  <option [value]="1">Available</option>
                  <option [value]="2">Under Repair</option>
                  <option [value]="3">Not Available</option>
                </select>
              </div>
              <div class="flex items-end gap-3">
                <button type="submit" [disabled]="saving()"
                  class="flex-1 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {{ saving() ? 'Saving…' : (editingId() ? 'Update Bus' : 'Add Bus') }}
                </button>
                <button type="button" (click)="cancelForm()"
                  class="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Loading Skeleton -->
      @if (loading()) {
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div class="px-6 py-3 border-b border-slate-100 bg-slate-50">
            <div class="h-4 bg-slate-200 rounded w-48 animate-pulse"></div>
          </div>
          @for (_ of [1,2,3,4,5]; track $index) {
            <div class="px-6 py-4 border-b border-slate-100 animate-pulse flex items-center gap-4">
              <div class="w-10 h-10 bg-slate-200 rounded-lg"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-slate-200 rounded w-32"></div>
                <div class="h-3 bg-slate-100 rounded w-48"></div>
              </div>
              <div class="flex gap-2">
                <div class="h-8 w-16 bg-slate-200 rounded-lg"></div>
                <div class="h-8 w-16 bg-slate-200 rounded-lg"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && buses().length === 0 && !showForm()) {
        <div class="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-center">
          <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
            </svg>
          </div>
          <h3 class="text-base font-semibold text-slate-800">No buses registered</h3>
          <p class="text-sm text-slate-500 mt-1 max-w-xs">Add your first bus to start building your fleet and accepting bookings.</p>
          <button (click)="openForm()" class="mt-5 px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
            Register First Bus
          </button>
        </div>
      }

      <!-- No Filter Results -->
      @if (!loading() && buses().length > 0 && filteredBuses().length === 0) {
        <div class="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-16 text-center">
          <div class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
            <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <p class="font-medium text-slate-700">No buses match your filters</p>
          <p class="text-sm text-slate-400 mt-1">Try adjusting your search criteria</p>
        </div>
      }

      <!-- Bus Table -->
      @if (!loading() && filteredBuses().length > 0) {
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div class="px-6 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fleet Overview</span>
            <span class="text-xs text-slate-400">{{ filteredBuses().length }} buses</span>
          </div>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-100 text-left">
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bus</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Registration</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Seats</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (bus of filteredBuses(); track bus.id) {
                <tr class="hover:bg-slate-50/60 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                        <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                        </svg>
                      </div>
                      <span class="font-semibold text-slate-900">{{ bus.code }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 font-mono text-slate-500 text-xs hidden sm:table-cell">{{ bus.registrationNumber }}</td>
                  <td class="px-6 py-4 text-slate-600">{{ busTypeLabel(bus.busType) }}</td>
                  <td class="px-6 py-4 text-slate-600 hidden md:table-cell">{{ bus.totalSeats }}</td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" [class]="statusBadge(bus.status)">
                      <span class="w-1.5 h-1.5 rounded-full" [class]="statusDot(bus.status)"></span>
                      {{ busStatusLabel(bus.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center justify-end gap-2">
                      <button (click)="editBus(bus)"
                        class="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                        Edit
                      </button>
                      <button (click)="deleteBus(bus.id)"
                        class="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                        Delete
                      </button>
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
    return ({1:'bg-emerald-50 text-emerald-700', 2:'bg-amber-50 text-amber-700', 3:'bg-red-50 text-red-700'} as any)[s] ?? 'bg-slate-100 text-slate-600';
  }
  statusDot(s: number): string {
    return ({1:'bg-emerald-500', 2:'bg-amber-500', 3:'bg-red-500'} as any)[s] ?? 'bg-slate-400';
  }
}
