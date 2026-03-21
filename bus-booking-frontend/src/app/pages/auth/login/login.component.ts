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
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Left panel -->
    <div class="hidden lg:flex lg:w-1/2 bg-red-600 flex-col justify-between p-12 relative overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-20 left-10 w-64 h-64 rounded-full border-[40px] border-white"></div>
        <div class="absolute bottom-20 right-10 w-96 h-96 rounded-full border-[60px] border-white"></div>
        <div class="absolute top-1/2 left-1/2 w-48 h-48 rounded-full border-[30px] border-white -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      <div class="relative z-10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM4 11V9l1-4h14l1 4v2H4z"/>
            </svg>
          </div>
          <span class="text-white text-xl font-bold">SwiftRoute</span>
        </div>
      </div>
      <div class="relative z-10 space-y-6">
        <h2 class="text-4xl font-bold text-white leading-tight">Travel smarter,<br/>book faster.</h2>
        <p class="text-red-100 text-lg">India's most trusted bus booking platform. 10,000+ routes, 500+ operators.</p>
        <div class="grid grid-cols-3 gap-4 pt-4">
          <div class="bg-white/15 rounded-xl p-4 text-center">
            <p class="text-2xl font-bold text-white">2M+</p>
            <p class="text-red-100 text-xs mt-0.5">Happy Travelers</p>
          </div>
          <div class="bg-white/15 rounded-xl p-4 text-center">
            <p class="text-2xl font-bold text-white">500+</p>
            <p class="text-red-100 text-xs mt-0.5">Bus Operators</p>
          </div>
          <div class="bg-white/15 rounded-xl p-4 text-center">
            <p class="text-2xl font-bold text-white">10K+</p>
            <p class="text-red-100 text-xs mt-0.5">Routes</p>
          </div>
        </div>
      </div>
      <div class="relative z-10 text-red-200 text-sm">© 2026 SwiftRoute. All rights reserved.</div>
    </div>

    <!-- Right panel -->
    <div class="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
      <div class="w-full max-w-md">
        <div class="mb-8">
          <div class="flex items-center gap-2 mb-6 lg:hidden">
            <div class="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM4 11V9l1-4h14l1 4v2H4z"/>
              </svg>
            </div>
            <span class="font-bold text-gray-900">SwiftRoute</span>
          </div>
          <h1 class="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p class="text-gray-500 mt-1">Sign in to your account to continue</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
            <input formControlName="username" type="text" placeholder="Enter your username"
              class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-colors"/>
            @if (isInvalid('username')) {
              <p class="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                Username is required
              </p>
            }
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-sm font-medium text-gray-700">Password</label>
            </div>
            <div class="relative">
              <input formControlName="password" [type]="showPwd() ? 'text' : 'password'" placeholder="Enter your password"
                class="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-colors pr-12"/>
              <button type="button" (click)="showPwd.update(v => !v)"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1">
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
            <div class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <p class="text-sm text-red-700">{{ errorMsg() }}</p>
            </div>
          }

          <button type="submit" [disabled]="loading()"
            class="w-full py-3.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700
                   disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm shadow-red-200">
            @if (loading()) {
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in...
              </span>
            } @else { Sign In }
          </button>

          <p class="text-center text-sm text-gray-500">
            Don't have an account?
            <a routerLink="/auth/register" class="text-red-600 font-semibold hover:underline ml-1">Create one</a>
          </p>
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