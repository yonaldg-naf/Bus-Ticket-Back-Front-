import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  template: `
  <div class="min-h-screen bg-slate-50 flex">

    <!-- ── Left panel ── -->
    <div class="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
      <!-- Subtle pattern -->
      <div class="absolute inset-0 opacity-5 pointer-events-none">
        <div class="absolute top-20 left-10 w-64 h-64 rounded-full border-[40px] border-white"></div>
        <div class="absolute bottom-20 right-10 w-96 h-96 rounded-full border-[60px] border-white"></div>
      </div>
      <!-- Red accent top bar -->
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>

      <div class="relative z-10">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/50">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM4 11V9l1-4h14l1 4v2H4z"/>
            </svg>
          </div>
          <span class="text-white text-2xl font-extrabold">SwiftRoute</span>
        </div>
      </div>

      <div class="relative z-10 space-y-6">
        <h2 class="text-4xl font-extrabold text-white leading-tight">Travel Further,<br/>Worry Less.</h2>
        <p class="text-slate-400 text-lg leading-relaxed">India's most trusted bus booking platform. 10,000+ routes, 500+ operators.</p>
        <ul class="space-y-3">
          @for (item of perks; track item) {
            <li class="flex items-center gap-3 text-slate-300 text-sm font-medium">
              <div class="w-5 h-5 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                <svg class="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
              {{ item }}
            </li>
          }
        </ul>
        <div class="grid grid-cols-3 gap-3 pt-2">
          <div class="bg-slate-800 rounded-2xl p-4 text-center border border-slate-700">
            <p class="text-2xl font-extrabold text-white">2M+</p>
            <p class="text-slate-500 text-xs mt-0.5">Happy Travelers</p>
          </div>
          <div class="bg-slate-800 rounded-2xl p-4 text-center border border-slate-700">
            <p class="text-2xl font-extrabold text-white">500+</p>
            <p class="text-slate-500 text-xs mt-0.5">Bus Operators</p>
          </div>
          <div class="bg-slate-800 rounded-2xl p-4 text-center border border-slate-700">
            <p class="text-2xl font-extrabold text-white">10K+</p>
            <p class="text-slate-500 text-xs mt-0.5">Routes</p>
          </div>
        </div>
      </div>

      <div class="relative z-10 text-slate-600 text-sm">© 2026 SwiftRoute Technologies Pvt. Ltd.</div>
    </div>

    <!-- ── Right panel ── -->
    <div class="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-white dark:bg-slate-800">
      <div class="w-full max-w-md">

        <!-- Mobile logo -->
        <div class="flex items-center gap-2.5 mb-8 lg:hidden">
          <div class="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-md shadow-red-200">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"/>
            </svg>
          </div>
          <span class="font-extrabold text-slate-900 dark:text-white text-xl">SwiftRoute</span>
        </div>

        <div class="mb-8">
          <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white">Welcome back</h1>
          <p class="text-slate-500 dark:text-slate-400 mt-1.5">Sign in to manage your bookings</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
          <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Username</label>
            <input formControlName="username" type="text" placeholder="Enter your username"
              class="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"/>
            @if (isInvalid('username')) {
              <p class="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                Username is required
              </p>
            }
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
            <div class="relative">
              <input formControlName="password" [type]="showPwd() ? 'text' : 'password'" placeholder="Enter your password"
                class="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"/>
              <button type="button" (click)="showPwd.update(v => !v)"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1">
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
            @if (isInvalid('password')) {
              <p class="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                At least 6 characters
              </p>
            }
          </div>

          @if (errorMsg()) {
            <div class="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <p class="text-sm text-red-700 dark:text-red-400">{{ errorMsg() }}</p>
            </div>
          }

          <button type="submit" [disabled]="loading()"
            class="w-full py-3.5 rounded-2xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-200 dark:shadow-red-900/30 text-base">
            @if (loading()) {
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in...
              </span>
            } @else { Log In to SwiftRoute }
          </button>

          <div class="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <a routerLink="/auth/forgot-password" class="text-red-600 font-medium hover:underline">Forgot password?</a>
            <span>New? <a routerLink="/auth/register" class="text-red-600 font-bold hover:underline ml-1">Create an account</a></span>
          </div>
        </form>
      </div>
    </div>
  </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  loading = signal(false);
  errorMsg = signal('');
  showPwd = signal(false);

  perks = [
    'Instant e-ticket confirmation',
    '24/7 customer support',
    'Free cancellation within 1 hour',
    'Exclusive member discounts',
  ];

  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isInvalid(f: string) { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true); this.errorMsg.set('');
    const { username, password } = this.form.value;
    this.auth.login({ username: username!, password: password! }).subscribe({
      next: () => { this.toast.success('Welcome back!'); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.errorMsg.set(err.error?.message ?? 'Invalid credentials.'); },
    });
  }
}
