import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { RouteService } from '../../../services/bus-route.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { RouteResponse } from '../../../models/stop-route.models';

@Component({
  selector: 'app-manage-routes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#0f0f10] text-white px-4 py-10 flex justify-center">
      <section class="w-full max-w-6xl">

        <!-- Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <a routerLink="/operator" class="text-red-500 hover:underline">← Operator Panel</a>
            <h1 class="text-2xl font-extrabold tracking-tight mt-1">Manage Routes</h1>
            <p class="text-gray-400 mt-1">Create or update your bus routes & their stops.</p>
          </div>
          <button class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition"
                  (click)="openForm()">
            + Add Route
          </button>
        </div>

        <!-- Add/Edit Form -->
        @if (showForm()) {
          <div class="bg-[#161618] border border-gray-700 rounded-2xl shadow-lg mb-6 p-6">
            <h3 class="font-semibold text-lg mb-4">
              {{ editingCode() ? 'Edit Route' : 'Add New Route' }}
            </h3>

            <form [formGroup]="form" (ngSubmit)="onSubmit()">

              <!-- Route Code -->
              <div class="mb-4">
                <label class="text-gray-400 mb-1 block">Route Code *</label>
                <input formControlName="routeCode"
                       type="text"
                       placeholder="e.g. MUM-PUN-01"
                       class="w-full px-4 py-2 rounded-xl bg-[#0f0f10] border border-gray-700 text-white
                              focus:border-red-500 focus:ring-2 focus:ring-red-500 outline-none"/>
                @if (isInvalid('routeCode')) {
                  <p class="text-red-500 text-xs mt-1">Route code is required.</p>
                }
              </div>

              <!-- Stops -->
              <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                  <label class="text-gray-400 font-medium">Stops (min 2) *</label>
                  <button type="button"
                          class="text-red-500 text-xs hover:underline"
                          (click)="addStop()">
                    + Add Stop
                  </button>
                </div>

                <div formArrayName="stops" class="space-y-3">
                  @for (stop of stopsArray.controls; track $index) {
                    <div [formGroupName]="$index"
                         class="flex gap-2 items-center bg-[#161618] border border-gray-700 rounded-xl p-3">

                      <span
                        class="w-6 h-6 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {{ $index + 1 }}
                      </span>

                      <input formControlName="city"
                             type="text"
                             placeholder="City"
                             class="input flex-1 bg-[#0f0f10] border border-gray-700 text-white focus:border-red-500 focus:ring-2 focus:ring-red-500 rounded-xl px-3 py-2"/>

                      <input formControlName="name"
                             type="text"
                             placeholder="Stop name"
                             class="input flex-1 bg-[#0f0f10] border border-gray-700 text-white focus:border-red-500 focus:ring-2 focus:ring-red-500 rounded-xl px-3 py-2"/>

                      @if (stopsArray.length > 2) {
                        <button type="button"
                                (click)="removeStop($index)"
                                class="p-2 text-red-500 hover:bg-red-50/10 rounded-lg transition">
                          ✕
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 pt-2">
                <button type="submit"
                        class="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold transition"
                        [disabled]="saving()">
                  {{ saving() ? 'Saving…' : (editingCode() ? 'Update Route' : 'Create Route') }}
                </button>

                <button type="button"
                        class="flex-1 border border-gray-700 hover:bg-gray-700/20 py-2 rounded-lg transition"
                        (click)="cancelForm()">
                  Cancel
                </button>
              </div>

              @if (errorMsg()) {
                <div class="mt-4 p-3 bg-red-900/20 border border-red-500 rounded-xl text-sm text-red-400">
                  {{ errorMsg() }}
                </div>
              }
            </form>
          </div>
        }

        <!-- Loading -->
        @if (loading()) {
          <div class="space-y-3">
            @for (_ of [1,2,3]; track $index) {
              <div class="bg-[#161618] border border-gray-700 rounded-xl p-4 animate-pulse">
                <div class="h-4 bg-gray-700 rounded w-40 mb-2"></div>
                <div class="h-3 bg-gray-800 rounded w-64"></div>
              </div>
            }
          </div>
        }

        <!-- Route List -->
        <div class="space-y-3">
          @for (route of routes(); track route.routeCode) {
            <div class="bg-[#161618] border border-gray-700 rounded-xl p-4 hover:shadow-lg transition">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="font-bold text-lg text-white">{{ route.routeCode }}</div>

                  <div class="flex items-center gap-1 mt-2 flex-wrap">
                    @for (stop of route.stops; track stop.stopId) {
                      <span class="px-2 py-1 rounded-lg bg-red-900/20 text-red-400 text-xs font-medium">
                        {{ stop.city }} - {{ stop.name }}
                      </span>
                      @if (!$last) {
                        <svg class="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                      }
                    }
                  </div>
                </div>

                <div class="flex gap-2">
                  <button (click)="editRoute(route)" class="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg text-white text-sm transition">
                    Edit
                  </button>

                  <button (click)="deleteRoute(route)"
                          class="bg-red-700 hover:bg-red-800 px-3 py-1 rounded-lg text-white text-sm transition">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          }

          @if (!loading() && routes().length === 0) {
            <div class="text-center py-16 text-gray-400">
              <div class="text-4xl mb-3">🗺️</div>
              <h3 class="font-semibold text-lg">No routes created yet</h3>
              <p class="mt-1">Add a route to get started.</p>
            </div>
          }
        </div>

      </section>
    </div>
  `,
})
export class ManageRoutesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private routeSrv = inject(RouteService);
  private authSrv = inject(AuthService);
  private toast = inject(ToastService);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  editingCode = signal<string | null>(null);
  errorMsg = signal('');
  routes = signal<RouteResponse[]>([]);

  form = this.fb.group({
    routeCode: ['', [Validators.required, Validators.maxLength(50)]],
    stops: this.fb.array([]),
  });

  get stopsArray(): FormArray {
    return this.form.get('stops') as FormArray;
  }

  private newStopGroup() {
    return this.fb.group({
      city: ['', Validators.required],
      name: ['', Validators.required],
    });
  }

  ngOnInit(): void { this.loadRoutes(); }

  loadRoutes(): void {
    this.loading.set(true);
    this.routeSrv.getAll().subscribe({
      next: (data) => { this.routes.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(): void {
    this.editingCode.set(null);
    this.errorMsg.set('');
    while (this.stopsArray.length) this.stopsArray.removeAt(0);
    // Push two stops individually to fix TS error
    this.stopsArray.push(this.newStopGroup());
    this.stopsArray.push(this.newStopGroup());
    this.form.get('routeCode')?.setValue('');
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  addStop(): void { this.stopsArray.push(this.newStopGroup()); }
  removeStop(i: number): void { if (this.stopsArray.length > 2) this.stopsArray.removeAt(i); }

  editRoute(route: RouteResponse): void {
    this.editingCode.set(route.routeCode);
    this.errorMsg.set('');
    while (this.stopsArray.length) this.stopsArray.removeAt(0);
    route.stops.forEach(s => {
      const group = this.newStopGroup();
      group.patchValue({ city: s.city, name: s.name });
      this.stopsArray.push(group);
    });
    this.form.get('routeCode')?.setValue(route.routeCode);
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingCode.set(null);
    this.errorMsg.set('');
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMsg.set('');

    const username = this.authSrv.currentUser()?.username ?? '';
    const v = this.form.value;
    const stops = v.stops as { city: string; name: string }[];

    if (this.editingCode()) {
      this.routeSrv.updateByKeys(username, this.editingCode()!, {
        newRouteCode: v.routeCode!,
        stops: stops.map(s => ({ city: s.city, name: s.name })),
      }).subscribe({
        next: () => { this.toast.success('Route updated.'); this.cancelForm(); this.saving.set(false); this.loadRoutes(); },
        error: (err) => { this.saving.set(false); this.errorMsg.set(err?.error?.message ?? 'Update failed.'); },
      });
    } else {
      this.routeSrv.createByKeys({
        operatorUsername: username,
        routeCode: v.routeCode!,
        stops: stops.map(s => ({ city: s.city, name: s.name })),
      }).subscribe({
        next: () => { this.toast.success('Route created!'); this.cancelForm(); this.saving.set(false); this.loadRoutes(); },
        error: (err) => { this.saving.set(false); this.errorMsg.set(err?.error?.message ?? 'Creation failed.'); },
      });
    }
  }

  deleteRoute(route: RouteResponse): void {
    if (!confirm('Delete this route?')) return;
    const username = this.authSrv.currentUser()?.username ?? '';
    this.routeSrv.deleteByKeys(username, route.routeCode).subscribe({
      next: () => { this.toast.success('Route deleted.'); this.loadRoutes(); },
      error: (err) => { this.toast.error(err?.error?.message ?? 'Delete failed.'); },
    });
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }
}