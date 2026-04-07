import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">

      <div class="text-center mb-8">
        <a routerLink="/home" class="inline-flex items-center gap-2.5">
          <div class="w-11 h-11 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"/>
            </svg>
          </div>
          <span class="text-2xl font-extrabold text-slate-900 dark:text-white">SwiftRoute</span>
        </a>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white mt-5">Reset your password</h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1.5">Enter your email and choose a new password</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-7 sm:p-8">

        @if (success()) {
          <div class="text-center py-4">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <p class="font-bold text-slate-900 dark:text-white text-lg">Password updated!</p>
            <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">You can now log in with your new password.</p>
            <a routerLink="/auth/login" class="inline-block mt-5 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors">
              Go to Login
            </a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">

            <div>
              <label class="form-label">Email Address</label>
              <input formControlName="email" type="email" placeholder="your@email.com"
                class="form-input dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
              @if (isInvalid('email')) {
                <p class="form-error">Valid email is required</p>
              }
            </div>

            <div>
              <label class="form-label">New Password</label>
              <div class="relative">
                <input formControlName="newPassword" [type]="showPwd() ? 'text' : 'password'" placeholder="Min. 6 characters"
                  class="form-input pr-12 dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                <button type="button" (click)="showPwd.update(v => !v)"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                  @if (showPwd()) {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
                    </svg>
                  } @else {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  }
                </button>
              </div>
              @if (isInvalid('newPassword')) {
                <p class="form-error">Min. 6 characters required</p>
              }
            </div>

            <div>
              <label class="form-label">Confirm New Password</label>
              <input formControlName="confirmPassword" [type]="showPwd() ? 'text' : 'password'" placeholder="Repeat new password"
                class="form-input dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
              @if (isInvalid('confirmPassword') || passwordMismatch()) {
                <p class="form-error">Passwords do not match</p>
              }
            </div>

            @if (errorMsg()) {
              <div class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p class="text-sm text-red-700">{{ errorMsg() }}</p>
              </div>
            }

            <button type="submit" [disabled]="loading()"
              class="btn-primary w-full py-3.5 text-base rounded-2xl shadow-lg shadow-red-200">
              @if (loading()) {
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Resetting…
              } @else { Reset Password }
            </button>

            <p class="text-center text-sm text-slate-500 dark:text-slate-400">
              Remember your password?
              <a routerLink="/auth/login" class="text-red-600 font-bold hover:underline ml-1">Log in</a>
            </p>
          </form>
        }
      </div>
    </div>
  </div>
  `,
})
export class ForgotPasswordComponent {
  private fb     = inject(FormBuilder);
  private http   = inject(HttpClient);
  private toast  = inject(ToastService);

  loading  = signal(false);
  errorMsg = signal('');
  success  = signal(false);
  showPwd  = signal(false);

  form = this.fb.group({
    email:           ['', [Validators.required, Validators.email]],
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  isInvalid(f: string) { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }

  get passwordMismatch(): boolean {
    const { newPassword, confirmPassword } = this.form.value;
    return !!(confirmPassword && newPassword !== confirmPassword);
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { newPassword, confirmPassword } = this.form.value;
    if (newPassword !== confirmPassword) { this.errorMsg.set('Passwords do not match.'); return; }

    this.loading.set(true);
    this.errorMsg.set('');
    const { email } = this.form.value;

    this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email, newPassword }).subscribe({
      next: () => { this.loading.set(false); this.success.set(true); this.toast.success('Password reset successfully!'); },
      error: (err) => { this.loading.set(false); this.errorMsg.set(err.error?.message ?? 'Reset failed. Please try again.'); },
    });
  }
}
