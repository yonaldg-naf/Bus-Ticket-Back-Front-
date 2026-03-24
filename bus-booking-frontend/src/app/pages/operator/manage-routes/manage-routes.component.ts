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
            <h1 class="text-xl font-semibold text-slate-900">Route Management</h1>
            <p class="text-sm text-slate-500 mt-0.5">{{ routes().length }} routes configured</p>
          </div>
        </div>
        <button (click)="openForm()"
          class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add Route
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-6 py-6 space-y-5">

      <!-- Search -->
      <div class="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <div class="flex flex-wrap gap-3 items-center">
          <div class="relative flex-1 min-w-[200px]">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input [(ngModel)]="searchQuery" placeholder="Search by route code or city…"
              class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
          </div>
          <span class="text-sm text-slate-500">{{ filteredRoutes().length }} result{{ filteredRoutes().length !== 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- Form -->
      @if (showForm()) {
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 class="font-semibold text-slate-900">{{ editingCode() ? 'Edit Route' : 'Create New Route' }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">Define the route code and all stops in order</p>
            </div>
            <button (click)="cancelForm()" class="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="p-6">
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
              <div class="max-w-xs">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Route Code *</label>
                <input formControlName="routeCode" type="text" placeholder="e.g. MUM-PUN-01"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
                @if (isInvalid('routeCode')) { <p class="text-xs text-red-500 mt-1">Route code is required</p> }
              </div>

              <!-- Stops Builder -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Stops <span class="text-slate-400 font-normal normal-case">(minimum 2)</span></label>
                  <button type="button" (click)="addStop()"
                    class="flex items-center gap-1.5 text-sm text-red-600 font-medium hover:text-red-700 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Add Stop
                  </button>
                </div>
                <div class="space-y-2" formArrayName="stops">
                  @for (_ of stopsArray.controls; track $index) {
                    <div [formGroupName]="$index" class="flex items-center gap-3">
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <div class="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">{{ $index + 1 }}</div>
                        @if (!$last) {
                          <div class="w-px h-6 bg-slate-200 ml-3"></div>
                        }
                      </div>
                      <input formControlName="city" placeholder="City"
                        class="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
                      <input formControlName="name" placeholder="Stop name"
                        class="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors"/>
                      @if (stopsArray.length > 2) {
                        <button type="button" (click)="removeStop($index)"
                          class="p-2 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      } @else {
                        <div class="w-8 flex-shrink-0"></div>
                      }
                    </div>
                  }
                </div>
              </div>

              @if (errorMsg()) {
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ errorMsg() }}</div>
              }

              <div class="flex gap-3 pt-1">
                <button type="submit" [disabled]="saving()"
                  class="px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {{ saving() ? 'Saving…' : (editingCode() ? 'Update Route' : 'Create Route') }}
                </button>
                <button type="button" (click)="cancelForm()"
                  class="px-6 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
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
          @for (_ of [1,2,3]; track $index) {
            <div class="px-6 py-5 border-b border-slate-100 animate-pulse">
              <div class="h-4 bg-slate-200 rounded w-32 mb-3"></div>
              <div class="flex gap-2">
                <div class="h-6 bg-slate-100 rounded-full w-28"></div>
                <div class="h-6 bg-slate-100 rounded-full w-28"></div>
                <div class="h-6 bg-slate-100 rounded-full w-28"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && routes().length === 0 && !showForm()) {
        <div class="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 text-center">
          <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
          </div>
          <h3 class="text-base font-semibold text-slate-800">No routes configured</h3>
          <p class="text-sm text-slate-500 mt-1 max-w-xs">Create your first route to start scheduling buses between cities.</p>
          <button (click)="openForm()" class="mt-5 px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
            Create First Route
          </button>
        </div>
      }

      <!-- No Filter Results -->
      @if (!loading() && routes().length > 0 && filteredRoutes().length === 0) {
        <div class="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-16 text-center">
          <p class="font-medium text-slate-700">No routes match your search</p>
          <p class="text-sm text-slate-400 mt-1">Try a different route code or city name</p>
        </div>
      }

      <!-- Route Table -->
      @if (!loading() && filteredRoutes().length > 0) {
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div class="px-6 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">All Routes</span>
            <span class="text-xs text-slate-400">{{ filteredRoutes().length }} routes</span>
          </div>
          <div class="divide-y divide-slate-100">
            @for (route of filteredRoutes(); track route.routeCode) {
              <div class="px-6 py-5 hover:bg-slate-50/60 transition-colors">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-3">
                      <span class="font-semibold text-slate-900">{{ route.routeCode }}</span>
                      <span class="text-xs text-slate-400">{{ route.stops.length }} stops</span>
                    </div>
                    <!-- Stop Timeline -->
                    <div class="flex items-center gap-0 flex-wrap">
                      @for (stop of route.stops; track stop.stopId) {
                        <div class="flex items-center gap-0">
                          <div class="flex flex-col items-center">
                            <div class="w-2 h-2 rounded-full" [class]="$first ? 'bg-red-600' : ($last ? 'bg-slate-800' : 'bg-slate-400')"></div>
                          </div>
                          <div class="mx-2 text-xs">
                            <span class="font-medium text-slate-700">{{ stop.city }}</span>
                            <span class="text-slate-400 ml-1">{{ stop.name }}</span>
                          </div>
                          @if (!$last) {
                            <svg class="w-3 h-3 text-slate-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                          }
                        </div>
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <button (click)="editRoute(route)"
                      class="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                      Edit
                    </button>
                    <button (click)="deleteRoute(route)"
                      class="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
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
