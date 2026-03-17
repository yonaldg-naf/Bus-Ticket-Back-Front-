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
    <section class="container max-w-6xl pt-10">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <a routerLink="/operator" class="text-sm text-[var(--accent)] hover:underline">← Operator Panel</a>
          <h1 class="text-2xl font-extrabold tracking-tight mt-1">Manage Routes</h1>
          <p class="text-muted">Create or update your bus routes & their stops.</p>
        </div>
        <button class="btn btn-primary h-9 px-4" (click)="openForm()">
          + Add Route
        </button>
      </div>

      <!-- Add/Edit Form -->
      @if (showForm()) {
        <div class="card mb-6">
          <div class="card-body">
            
            <h3 class="font-semibold text-lg mb-4">
              {{ editingCode() ? 'Edit Route' : 'Add New Route' }}
            </h3>

            <form [formGroup]="form" (ngSubmit)="onSubmit()">

              <!-- Route Code -->
              <div class="mb-4">
                <label class="label">Route Code *</label>
                <input formControlName="routeCode"
                       type="text"
                       placeholder="e.g. MUM-PUN-01"
                       class="input"/>
                @if (isInvalid('routeCode')) {
                  <p class="text-xs text-red-600 mt-1">Route code is required.</p>
                }
              </div>

              <!-- Stops -->
              <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                  <label class="label">Stops (min 2) *</label>
                  <button type="button"
                          class="text-xs text-[var(--accent)] hover:underline"
                          (click)="addStop()">
                    + Add Stop
                  </button>
                </div>

                <div formArrayName="stops" class="space-y-3">
                  @for (stop of stopsArray.controls; track $index) {
                    <div [formGroupName]="$index"
                         class="flex gap-2 items-center bg-[var(--card)] border border-[var(--border)]
                                rounded-xl p-3">

                      <span
                        class="w-6 h-6 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex 
                               items-center justify-center text-xs font-bold flex-shrink-0">
                        {{ $index + 1 }}
                      </span>

                      <input formControlName="city"
                             type="text"
                             placeholder="City"
                             class="input flex-1"/>

                      <input formControlName="name"
                             type="text"
                             placeholder="Stop name"
                             class="input flex-1"/>

                      @if (stopsArray.length > 2) {
                        <button type="button"
                                (click)="removeStop($index)"
                                class="p-2 text-red-500 hover:bg-red-50 rounded-lg">
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
                        class="btn btn-primary flex-1"
                        [disabled]="saving()">
                  {{ saving() ? 'Saving…' : (editingCode() ? 'Update Route' : 'Create Route') }}
                </button>

                <button type="button"
                        class="btn btn-ghost flex-1"
                        (click)="cancelForm()">
                  Cancel
                </button>
              </div>

            </form>

            @if (errorMsg()) {
              <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {{ errorMsg() }}
              </div>
            }

          </div>
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1,2,3]; track $index) {
            <div class="card"><div class="card-body animate-pulse">
              <div class="h-4 bg-[#EEE] rounded w-40 mb-2"></div>
              <div class="h-3 bg-[#F4F4F4] rounded w-64"></div>
            </div></div>
          }
        </div>
      }

      <!-- Route List -->
      <div class="space-y-3">
        @for (route of routes(); track route.routeCode) {
          <div class="card hover:card-soft transition">
            <div class="card-body">

              <div class="flex items-start justify-between gap-4">

                <div>
                  <div class="font-bold text-lg">{{ route.routeCode }}</div>

                  <div class="flex items-center gap-1 mt-2 flex-wrap">
                    @for (stop of route.stops; track stop.stopId) {
                      <span class="badge badge-neutral">
                        {{ stop.city }} - {{ stop.name }}
                      </span>
                      @if (!$last) {
                        <svg class="w-3 h-3 text-muted" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 5l7 7-7 7"/>
                        </svg>
                      }
                    }
                  </div>
                </div>

                <div class="flex gap-2">
                  <button (click)="editRoute(route)" class="btn btn-secondary h-9">
                    Edit
                  </button>

                  <button (click)="deleteRoute(route)"
                          class="btn btn-ghost h-9 border border-red-200 text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </div>

              </div>

            </div>
          </div>
        }

        @if (!loading() && routes().length === 0) {
          <div class="text-center py-16">
            <div class="text-4xl mb-3">🗺️</div>
            <h3 class="font-semibold text-lg">No routes created yet</h3>
            <p class="text-muted mt-1">Add a route to get started.</p>
          </div>
        }
      </div>

    </section>
  `,
})
export class ManageRoutesComponent implements OnInit {

  private fb         = inject(FormBuilder);
  private routeSrv   = inject(RouteService);
  private authSrv    = inject(AuthService);
  private toast      = inject(ToastService);

  loading     = signal(true);
  saving      = signal(false);
  showForm    = signal(false);
  editingCode = signal<string | null>(null);
  errorMsg    = signal('');
  routes      = signal<RouteResponse[]>([]);

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

  ngOnInit(): void {
    this.loadRoutes();
  }

  /** Load List */
  loadRoutes(): void {
    this.loading.set(true);
    this.routeSrv.getAll().subscribe({
      next: (data) => {
        this.routes.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Show Form (Add) */
  openForm(): void {
    this.editingCode.set(null);
    this.errorMsg.set('');
    while (this.stopsArray.length) this.stopsArray.removeAt(0);

    this.stopsArray.push(this.newStopGroup());
    this.stopsArray.push(this.newStopGroup());

    this.form.get('routeCode')?.setValue('');
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Add Stop */
  addStop(): void {
    this.stopsArray.push(this.newStopGroup());
  }

  /** Remove Stop */
  removeStop(i: number): void {
    if (this.stopsArray.length > 2) this.stopsArray.removeAt(i);
  }

  /** Edit */
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

  /** Cancel */
  cancelForm(): void {
    this.showForm.set(false);
    this.editingCode.set(null);
    this.errorMsg.set('');
  }

  /** Submit */
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMsg.set('');

    const username = this.authSrv.currentUser()?.username ?? '';
    const v        = this.form.value;
    const stops    = v.stops as { city: string; name: string }[];

    if (this.editingCode()) {
      // Update route
      this.routeSrv.updateByKeys(username, this.editingCode()!, {
        newRouteCode: v.routeCode!,
        stops: stops.map(s => ({ city: s.city, name: s.name })),
      }).subscribe({
        next: () => {
          this.toast.success('Route updated.');
          this.cancelForm();
          this.saving.set(false);
          this.loadRoutes();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMsg.set(err?.error?.message ?? 'Update failed.');
        },
      });
    } else {
      // Create new route
      this.routeSrv.createByKeys({
        operatorUsername: username,
        routeCode: v.routeCode!,
        stops: stops.map(s => ({ city: s.city, name: s.name })),
      }).subscribe({
        next: () => {
          this.toast.success('Route created!');
          this.cancelForm();
          this.saving.set(false);
          this.loadRoutes();
        },
        error: (err) => {
          this.saving.set(false);
          this.errorMsg.set(err?.error?.message ?? 'Creation failed.');
        },
      });
    }
  }

  /** Delete */
  deleteRoute(route: RouteResponse): void {
    if (!confirm('Delete this route?')) return;

    const username = this.authSrv.currentUser()?.username ?? '';
    this.routeSrv.deleteByKeys(username, route.routeCode).subscribe({
      next: () => {
        this.toast.success('Route deleted.');
        this.loadRoutes();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Delete failed.'),
    });
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }
}