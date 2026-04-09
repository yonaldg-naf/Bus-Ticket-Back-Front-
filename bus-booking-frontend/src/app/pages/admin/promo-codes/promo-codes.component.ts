import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PromoCodeService, PromoCodeResponse } from '../../../services/promo-code.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-promo-codes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900">
    <div class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <a routerLink="/admin" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-500 dark:text-slate-300 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <div>
            <h1 class="text-base font-bold text-slate-900 dark:text-white">Promo Codes</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ promos().length }} codes</p>
          </div>
        </div>
        <button (click)="showForm.set(!showForm())" class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-red-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          New Code
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      @if (showForm()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 class="font-bold text-slate-900 dark:text-white">Create Promo Code</h3>
            <button (click)="showForm.set(false)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="p-6">
            <form [formGroup]="form" (ngSubmit)="onCreate()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Code *</label>
                <input formControlName="code" type="text" placeholder="SAVE20"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"/>
                @if (isInvalid('code')) { <p class="text-xs text-red-500 mt-1">Required</p> }
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Discount Type *</label>
                <select formControlName="discountType" class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none">
                  <option [value]="1">Flat (₹)</option>
                  <option [value]="2">Percentage (%)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Discount Value *</label>
                <input formControlName="discountValue" type="number" min="0.01"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none"/>
                @if (isInvalid('discountValue')) { <p class="text-xs text-red-500 mt-1">Required</p> }
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Max Uses *</label>
                <input formControlName="maxUses" type="number" min="1"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none"/>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Expires At *</label>
                <input formControlName="expiresAtUtc" type="datetime-local"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none"/>
                @if (isInvalid('expiresAtUtc')) { <p class="text-xs text-red-500 mt-1">Required</p> }
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Min Booking Amount</label>
                <input formControlName="minBookingAmount" type="number" min="0" placeholder="Optional"
                  class="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 dark:text-white focus:outline-none"/>
              </div>
              <div class="flex items-end gap-3">
                <button type="submit" [disabled]="saving()" class="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                  {{ saving() ? 'Creating...' : 'Create Code' }}
                </button>
                <button type="button" (click)="showForm.set(false)" class="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-400">Loading...</div>
      }

      @if (!loading() && promos().length === 0 && !showForm()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center py-20 text-center">
          <h3 class="text-base font-semibold text-slate-800 dark:text-white">No promo codes yet</h3>
          <button (click)="showForm.set(true)" class="mt-5 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700">Create First Code</button>
        </div>
      }

      @if (!loading() && promos().length > 0) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-left">
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Discount</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Uses</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Expires</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th class="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50 dark:divide-slate-700">
              @for (p of promos(); track p.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td class="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{{ p.code }}</td>
                  <td class="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {{ p.discountType === 1 ? '₹' + p.discountValue : p.discountValue + '%' }}
                  </td>
                  <td class="px-6 py-4 text-slate-600 dark:text-slate-300 hidden md:table-cell">{{ p.usedCount }} / {{ p.maxUses }}</td>
                  <td class="px-6 py-4 text-slate-600 dark:text-slate-300 text-xs hidden md:table-cell">{{ formatDate(p.expiresAtUtc) }}</td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded-full text-xs font-semibold" [class]="p.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'">
                      {{ p.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center justify-end gap-2">
                      <button (click)="toggle(p)" class="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700">
                        {{ p.isActive ? 'Disable' : 'Enable' }}
                      </button>
                      <button (click)="deletePromo(p.id)" class="px-3 py-1.5 text-xs font-semibold border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
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
export class PromoCodesComponent implements OnInit {
  private svc   = inject(PromoCodeService);
  private toast = inject(ToastService);
  private fb    = inject(FormBuilder);

  loading  = signal(true);
  saving   = signal(false);
  showForm = signal(false);
  promos   = signal<PromoCodeResponse[]>([]);

  form = this.fb.group({
    code:             ['', [Validators.required, Validators.maxLength(50)]],
    discountType:     [1, Validators.required],
    discountValue:    [null as number | null, [Validators.required, Validators.min(0.01)]],
    maxUses:          [100, Validators.required],
    expiresAtUtc:     ['', Validators.required],
    minBookingAmount: [null as number | null],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: d => { this.promos.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onCreate() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.form.value;
    this.svc.create({
      code: v.code!, discountType: +v.discountType!, discountValue: +v.discountValue!,
      maxUses: +v.maxUses!, expiresAtUtc: new Date(v.expiresAtUtc!).toISOString(),
      minBookingAmount: v.minBookingAmount ? +v.minBookingAmount : undefined,
    }).subscribe({
      next: () => { this.toast.success('Promo code created!'); this.showForm.set(false); this.form.reset({ discountType: 1, maxUses: 100 }); this.load(); this.saving.set(false); },
      error: err => { this.saving.set(false); this.toast.error(err.error?.message ?? 'Creation failed.'); },
    });
  }

  toggle(p: PromoCodeResponse) {
    this.svc.toggle(p.id).subscribe({
      next: () => { this.toast.success(`Code ${p.isActive ? 'disabled' : 'enabled'}.`); this.load(); },
      error: err => this.toast.error(err.error?.message ?? 'Toggle failed.'),
    });
  }

  deletePromo(id: string) {
    if (!confirm('Delete this promo code?')) return;
    this.svc.delete(id).subscribe({
      next: () => { this.toast.success('Deleted.'); this.load(); },
      error: err => this.toast.error(err.error?.message ?? 'Delete failed.'),
    });
  }

  formatDate(utc: string): string {
    return new Date(utc).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  isInvalid(f: string) { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }
}
