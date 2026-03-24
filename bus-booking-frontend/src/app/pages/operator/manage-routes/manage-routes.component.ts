import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouteService } from '../../../services/bus-route.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { RouteResponse } from '../../../models/stop-route.models';

@Component({
  selector: 'app-manage-routes',
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
            <h1 class="text-lg font-bold text-gray-900">Manage Routes</h1>
            <p class="text-sm text-gray-500">{{ filteredRoutes().length }} of {{ routes().length }} routes</p>
          </div>
        </div>
        <button (click)="openForm()" class="btn-primary">+ Add Route</button>
      </div>

      <!-- Search -->
      <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
        <div class="relative max-w-sm">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input [(ngModel)]="searchQuery" placeholder="Search route code or city…"
            class="form-input pl-9 py-2 text-sm w-full"/>
        </div>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      <!-- Form -->
      @if (showForm()) {
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="font-semibold text-gray-800">{{ editingCode() ? 'Edit Route' : 'Add New Route' }}</h3>
            <button (click)="cancelForm()" class="text-gray-400 hover:text-gray-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="p-5">
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">

              <div>
                <label class="form-label">Route Code *</label>
                <input formControlName="routeCode" type="text" placeholder="e.g. MUM-PUN-01" class="form-input max-w-xs"/>
                @if (isInvalid('routeCode')) { <p class="form-error">Route code is required</p> }
              </div>

              <!-- Stops -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="form-label mb-0">Stops <span class="text-gray-400 font-normal">(min 2)</span> *</label>
                  <button type="button" (click)="addStop()"
                    class="text-sm text-red-600 font-medium hover:text-red-700 flex items-center gap-1 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Add Stop
                  </button>
                </div>
                <div class="space-y-2" formArrayName="stops">
                  @for (_ of stopsArray.controls; track $index) {
                    <div [formGroupName]="$index" class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div class="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {{ $index + 1 }}
                      </div>
                      <input formControlName="city" placeholder="City" class="form-input flex-1 py-2 text-sm"/>
                      <input formControlName="name" placeholder="Stop name" class="form-input flex-1 py-2 text-sm"/>
                      @if (stopsArray.length > 2) {
                        <button type="button" (click)="removeStop($index)"
                          class="text-red-400 hover:text-red-600 transition-colors flex-shrink-0 p-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>

              @if (errorMsg()) {
                <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{{ errorMsg() }}</div>
              }

              <div class="flex gap-3 pt-1">
                <button type="submit" [disabled]="saving()" class="btn-primary flex-1 py-3">
                  {{ saving() ? 'Saving…' : (editingCode() ? 'Update Route' : 'Create Route') }}
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
              <div class="h-5 skeleton w-32 rounded mb-3"></div>
              <div class="flex gap-2"><div class="h-7 skeleton w-28 rounded-lg"></div><div class="h-7 skeleton w-28 rounded-lg"></div></div>
            </div>
          }
        </div>
      }

      <!-- Empty -->
      @if (!loading() && routes().length === 0 && !showForm()) {
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center text-4xl mb-4">🗺️</div>
          <h3 class="text-lg font-bold text-gray-800">No routes yet</h3>
          <p class="text-gray-500 mt-1.5 text-sm">Create your first route to start scheduling buses.</p>
          <button (click)="openForm()" class="btn-primary mt-5">+ Add First Route</button>
        </div>
      }

      <!-- No results after filter -->
      @if (!loading() && routes().length > 0 && filteredRoutes().length === 0) {
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="text-4xl mb-3">🔍</div>
          <p class="font-semibold text-gray-700">No routes match your search</p>
          <p class="text-sm text-gray-400 mt-1">Try a different route code or city name</p>
        </div>
      }

      <!-- Route List -->
      @if (!loading() && filteredRoutes().length > 0) {
        <div class="space-y-3">
          @for (route of filteredRoutes(); track route.routeCode) {
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-gray-900 text-base mb-2">{{ route.routeCode }}</h3>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    @for (stop of route.stops; track stop.stopId) {
                      <span class="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                        📍 {{ stop.city }} — {{ stop.name }}
                      </span>
                      @if (!$last) {
                        <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                      }
                    }
                  </div>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                  <button (click)="editRoute(route)" class="btn-secondary px-4 py-2 text-sm">Edit</button>
                  <button (click)="deleteRoute(route)"
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
export class ManageRoutesComponent implements OnInit {
  private fb       = inject(FormBuilder);
  private routeSrv = inject(RouteService);
  private authSrv  = inject(AuthService);
  private toast    = inject(ToastService);

  loading     = signal(true);
  saving      = signal(false);
  showForm    = signal(false);
  editingCode = signal<string | null>(null);
  errorMsg    = signal('');
  routes      = signal<RouteResponse[]>([]);

  searchQuery = '';

  filteredRoutes = computed(() => {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.routes();
    return this.routes().filter(r =>
      r.routeCode.toLowerCase().includes(q) ||
      r.stops.some(s => s.city.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    );
  });

  form = this.fb.group({
    routeCode: ['', [Validators.required, Validators.maxLength(50)]],
    stops:     this.fb.array([]),
  });

  get stopsArray(): FormArray { return this.form.get('stops') as FormArray; }
  private newStop() { return this.fb.group({ city: ['', Validators.required], name: ['', Validators.required] }); }

  ngOnInit() { this.loadRoutes(); }

  loadRoutes() {
    this.loading.set(true);
    this.routeSrv.getAll().subscribe({
      next: d => { this.routes.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm() {
    this.editingCode.set(null); this.errorMsg.set('');
    while (this.stopsArray.length) this.stopsArray.removeAt(0);
    this.stopsArray.push(this.newStop()); this.stopsArray.push(this.newStop());
    this.form.get('routeCode')?.setValue('');
    this.showForm.set(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  addStop()            { this.stopsArray.push(this.newStop()); }
  removeStop(i: number){ if (this.stopsArray.length > 2) this.stopsArray.removeAt(i); }

  editRoute(route: RouteResponse) {
    this.editingCode.set(route.routeCode); this.errorMsg.set('');
    while (this.stopsArray.length) this.stopsArray.removeAt(0);
    route.stops.forEach(s => { const g = this.newStop(); g.patchValue({ city: s.city, name: s.name }); this.stopsArray.push(g); });
    this.form.get('routeCode')?.setValue(route.routeCode);
    this.showForm.set(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm() { this.showForm.set(false); this.editingCode.set(null); this.errorMsg.set(''); }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.errorMsg.set('');
    const username = this.authSrv.currentUser()?.username ?? '';
    const v = this.form.value;
    const stops = (v.stops as { city: string; name: string }[]);

    if (this.editingCode()) {
      this.routeSrv.updateByKeys(username, this.editingCode()!, { newRouteCode: v.routeCode!, stops }).subscribe({
        next:  () => { this.toast.success('Route updated.'); this.cancelForm(); this.saving.set(false); this.loadRoutes(); },
        error: err => { this.saving.set(false); this.errorMsg.set(err?.error?.message ?? 'Update failed.'); },
      });
    } else {
      this.routeSrv.createByKeys({ operatorUsername: username, routeCode: v.routeCode!, stops }).subscribe({
        next:  () => { this.toast.success('Route created!'); this.cancelForm(); this.saving.set(false); this.loadRoutes(); },
        error: err => { this.saving.set(false); this.errorMsg.set(err?.error?.message ?? 'Creation failed.'); },
      });
    }
  }

  deleteRoute(route: RouteResponse) {
    if (!confirm('Delete this route? This cannot be undone.')) return;
    this.routeSrv.deleteByKeys(this.authSrv.currentUser()?.username ?? '', route.routeCode).subscribe({
      next:  () => { this.toast.success('Route deleted.'); this.loadRoutes(); },
      error: err => this.toast.error(err?.error?.message ?? 'Delete failed.'),
    });
  }

  isInvalid(f: string) { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }
}