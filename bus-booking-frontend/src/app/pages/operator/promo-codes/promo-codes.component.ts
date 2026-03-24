import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PromoCodeService, PromoCodeResponse, CreatePromoCodeRequest } from '../../../services/promo-code.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-promo-codes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
  <div class="min-h-screen bg-slate-50">

    <!-- Header -->
    <div class="bg-white border-b border-slate-200 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <a routerLink="/operator" class="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors text-slate-500 hover:text-red-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <div>
            <h1 class="text-base font-bold text-slate-900">Promo Codes</h1>
            <p class="text-xs text-slate-500">Create and manage discount codes</p>
          </div>
        </div>
        <button (click)="showForm.set(!showForm())"
          class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-red-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          New Promo Code
        </button>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      <!-- Create Form -->
      @if (showForm()) {
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 class="font-bold text-slate-900">Create Promo Code</h2>
            <button (click)="showForm.set(false)" class="text-slate-400 hover:text-slate-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Code *</label>
              <input [(ngModel)]="form.code" placeholder="e.g. SAVE20" class="input-field uppercase" style="text-transform:uppercase"/>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Discount Type *</label>
              <select [(ngModel)]="form.discountType" class="input-field">
                <option [value]="1">Flat Amount (₹)</option>
                <option [value]="2">Percentage (%)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Discount Value *</label>
              <input [(ngModel)]="form.discountValue" type="number" min="1" placeholder="{{ form.discountType === 2 ? 'e.g. 10 (%)' : 'e.g. 100 (₹)' }}" class="input-field"/>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Max Uses *</label>
              <input [(ngModel)]="form.maxUses" type="number" min="1" placeholder="e.g. 100" class="input-field"/>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Min Booking Amount (₹)</label>
              <input [(ngModel)]="form.minBookingAmount" type="number" min="0" placeholder="Optional" class="input-field"/>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Max Discount (₹)</label>
              <input [(ngModel)]="form.maxDiscountAmount" type="number" min="0" placeholder="Optional cap" class="input-field"/>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Expires At *</label>
              <input [(ngModel)]="form.expiresAtUtc" type="datetime-local" class="input-field"/>
            </div>
            <div class="sm:col-span-2 flex gap-3 pt-2">
              <button (click)="create()" [disabled]="saving()"
                class="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                {{ saving() ? 'Creating…' : 'Create Code' }}
              </button>
              <button (click)="showForm.set(false)" class="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Promo Codes List -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 class="font-bold text-slate-900">My Promo Codes</h2>
          <span class="text-xs text-slate-400">{{ codes().length }} total</span>
        </div>

        @if (loading()) {
          <div class="flex items-center justify-center py-16 gap-3 text-slate-400">
            <svg class="animate-spin w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Loading…
          </div>
        } @else if (codes().length === 0) {
          <div class="text-center py-16 text-slate-400">
            <p class="text-4xl mb-3">🏷️</p>
            <p class="font-medium text-slate-500">No promo codes yet</p>
            <p class="text-sm mt-1">Create your first discount code above</p>
          </div>
        } @else {
          <div class="divide-y divide-slate-50">
            @for (code of codes(); track code.id) {
              <div class="px-6 py-4 flex items-center gap-4 flex-wrap">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-3 flex-wrap">
                    <span class="font-mono font-bold text-slate-900 text-base tracking-wider">{{ code.code }}</span>
                    <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                      [class]="code.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'">
                      {{ code.isActive ? 'Active' : 'Inactive' }}
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {{ code.discountType === 2 ? code.discountValue + '%' : '₹' + code.discountValue }} off
                    </span>
                  </div>
                  <div class="flex items-center gap-4 mt-1.5 text-xs text-slate-400 flex-wrap">
                    <span>{{ code.usedCount }}/{{ code.maxUses }} used</span>
                    @if (code.minBookingAmount) { <span>Min ₹{{ code.minBookingAmount }}</span> }
                    <span>Expires {{ formatDate(code.expiresAtUtc) }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button (click)="toggle(code)" class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors"
                    [class]="code.isActive ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-green-200 text-green-700 hover:bg-green-50'">
                    {{ code.isActive ? 'Disable' : 'Enable' }}
                  </button>
                  <button (click)="remove(code.id)" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  </div>
  `,
})
export class PromoCodesComponent implements OnInit {
  private promoSvc = inject(PromoCodeService);
  private toast    = inject(ToastService);

  loading  = signal(true);
  saving   = signal(false);
  showForm = signal(false);
  codes    = signal<PromoCodeResponse[]>([]);

  form: CreatePromoCodeRequest = {
    code: '', discountType: 1, discountValue: 0,
    maxUses: 100, expiresAtUtc: '',
    minBookingAmount: undefined, maxDiscountAmount: undefined,
  };

  ngOnInit() { this.loadCodes(); }

  loadCodes() {
    this.loading.set(true);
    this.promoSvc.getMy().subscribe({
      next:  d  => { this.codes.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  create() {
    if (!this.form.code || !this.form.discountValue || !this.form.expiresAtUtc) {
      this.toast.error('Please fill all required fields.'); return;
    }
    this.saving.set(true);
    const dto = { ...this.form, code: this.form.code.toUpperCase() };
    this.promoSvc.create(dto).subscribe({
      next: c => {
        this.codes.update(list => [c, ...list]);
        this.saving.set(false);
        this.showForm.set(false);
        this.toast.success('Promo code created!');
        this.form = { code: '', discountType: 1, discountValue: 0, maxUses: 100, expiresAtUtc: '' };
      },
      error: err => { this.saving.set(false); this.toast.error(err.error?.message ?? 'Failed to create.'); },
    });
  }

  toggle(code: PromoCodeResponse) {
    this.promoSvc.toggle(code.id).subscribe({
      next: updated => this.codes.update(list => list.map(c => c.id === updated.id ? updated : c)),
      error: () => this.toast.error('Failed to update.'),
    });
  }

  remove(id: string) {
    if (!confirm('Delete this promo code?')) return;
    this.promoSvc.delete(id).subscribe({
      next: () => { this.codes.update(list => list.filter(c => c.id !== id)); this.toast.success('Deleted.'); },
      error: () => this.toast.error('Failed to delete.'),
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
