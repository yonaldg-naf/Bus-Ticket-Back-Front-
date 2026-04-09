import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouteService, RouteResponse } from '../../../services/bus-route.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-manage-routes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <a routerLink="/admin" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-500 dark:text-slate-300 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <div>
            <h1 class="text-base font-bold text-slate-900 dark:text-white">Route Management</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ routes().length }} routes configured</p>
          </div>
        </div>
        <button (click)="openForm()" class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-red-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Add Route
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-6 py-6 space-y-5">

      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-5 py-4">
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input [(ngModel)]="searchQuery" placeholder="Search by route code or city…"
            class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"/>
        </div>
      </div>

      @if (showForm()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 class="font-bold text-slate-900 dark:text-white">{{ editingId() ? 'Edit Route' : 'Create New Route' }}</h3>
            <button (click)="cancelForm()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="p-6">
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
              <div class="max-w-xs">
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Route Code *</label>
                <input formControlName="routeCode" type="text" placeholder="e.g. MUM-PUN-01"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"/>
                @if (isInvalid('routeCode')) { <p class="text-xs text-red-500 mt-1">Required</p> }
              </div>

              <div>
                <div class="flex items-center justify-between mb-3">
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Stops (min 2)</label>
                  <button type="button" (click)="addStop()" class="flex items-center gap-1.5 text-sm text-red-600 font-medium hover:text-red-700">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    Add Stop
                  </button>
                </div>
                <div class="space-y-2" formArrayName="stops">
                  @for (_ of stopsArray.controls; track $index) {
                    <div [formGroupName]="$index" class="flex items-center gap-3">
                      <div class="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{{ $index + 1 }}</div>
                      <input formControlName="city" placeholder="City"
                        class="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"/>
                      <input formControlName="name" placeholder="Stop name"
                        class="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"/>
                      @if (stopsArray.length > 2) {
                        <button type="button" (click)="removeStop($index)" class="p-2 text-slate-400 hover:text-red-500">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      } @else { <div class="w-8 flex-shrink-0"></div> }
                    </div>
                  }
                </div>
              </div>

              @if (errorMsg()) {
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ errorMsg() }}</div>
              }

              <div class="flex gap-3 pt-1">
                <button type="submit" [disabled]="saving()" class="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                  {{ saving() ? 'Saving…' : (editingId() ? 'Update Route' : 'Create Route') }}
                </button>
                <button type="button" (click)="cancelForm()" class="px-6 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">Loading...</div>
      }

      @if (!loading() && routes().length === 0 && !showForm()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center py-20 text-center">
          <h3 class="text-base font-semibold text-slate-800 dark:text-white">No routes configured</h3>
          <button (click)="openForm()" class="mt-5 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">Create First Route</button>
        </div>
      }

      @if (!loading() && filteredRoutes().length > 0) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div class="divide-y divide-slate-50 dark:divide-slate-700">
            @for (route of filteredRoutes(); track route.id) {
              <div class="px-6 py-5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-3">
                      <span class="font-bold text-slate-900 dark:text-white">{{ route.routeCode }}</span>
                      <span class="text-xs text-slate-400">{{ route.stops.length }} stops</span>
                    </div>
                    <div class="flex items-center gap-0 flex-wrap">
                      @for (stop of route.stops; track stop.stopId) {
                        <div class="flex items-center gap-0">
                          <div class="w-2 h-2 rounded-full" [class]="$first ? 'bg-red-600' : ($last ? 'bg-slate-800' : 'bg-slate-400')"></div>
                          <div class="mx-2 text-xs">
                            <span class="font-medium text-slate-700 dark:text-slate-200">{{ stop.city }}</span>
                            <span class="text-slate-400 ml-1">{{ stop.name }}</span>
                          </div>
                          @if (!$last) {
                            <svg class="w-3 h-3 text-slate-300 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                          }
                        </div>
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <button (click)="editRoute(route)" class="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700">Edit</button>
                    <button (click)="deleteRoute(route)" class="px-3 py-1.5 text-xs font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
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
  private toast    = inject(ToastService);

  loading    = signal(true);
  saving     = signal(false);
  showForm   = signal(false);
  editingId  = signal<string | null>(null);
  errorMsg   = signal('');
  routes     = signal<RouteResponse[]>([]);
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
    this.editingId.set(null); this.errorMsg.set('');
    while (this.stopsArray.length) this.stopsArray.removeAt(0);
    this.stopsArray.push(this.newStop()); this.stopsArray.push(this.newStop());
    this.form.get('routeCode')?.setValue('');
    this.showForm.set(true);
  }

  addStop()             { this.stopsArray.push(this.newStop()); }
  removeStop(i: number) { if (this.stopsArray.length > 2) this.stopsArray.removeAt(i); }

  editRoute(route: RouteResponse) {
    this.editingId.set(route.id); this.errorMsg.set('');
    while (this.stopsArray.length) this.stopsArray.removeAt(0);
    route.stops.forEach(s => { const g = this.newStop(); g.patchValue({ city: s.city, name: s.name }); this.stopsArray.push(g); });
    this.form.get('routeCode')?.setValue(route.routeCode);
    this.showForm.set(true);
  }

  cancelForm() { this.showForm.set(false); this.editingId.set(null); this.errorMsg.set(''); }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.errorMsg.set('');
    const v     = this.form.value;
    const stops = (v.stops as { city: string; name: string }[]);
    const id    = this.editingId();

    if (id) {
      this.routeSrv.update(id, { newRouteCode: v.routeCode!, stops }).subscribe({
        next:  () => { this.toast.success('Route updated.'); this.cancelForm(); this.saving.set(false); this.loadRoutes(); },
        error: err => { this.saving.set(false); this.errorMsg.set(err?.error?.message ?? 'Update failed.'); },
      });
    } else {
      this.routeSrv.create({ routeCode: v.routeCode!, stops }).subscribe({
        next:  () => { this.toast.success('Route created!'); this.cancelForm(); this.saving.set(false); this.loadRoutes(); },
        error: err => { this.saving.set(false); this.errorMsg.set(err?.error?.message ?? 'Creation failed.'); },
      });
    }
  }

  deleteRoute(route: RouteResponse) {
    if (!confirm('Delete this route?')) return;
    this.routeSrv.delete(route.id).subscribe({
      next:  () => { this.toast.success('Route deleted.'); this.loadRoutes(); },
      error: err => this.toast.error(err?.error?.message ?? 'Delete failed.'),
    });
  }

  isInvalid(f: string) { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }
}
