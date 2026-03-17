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
  <div class="min-h-screen flex items-center justify-center bg-[#0f0f10] px-4">

    <div class="w-full max-w-md">

      <h1 class="text-4xl font-bold text-white text-center mb-2">BusGo</h1>
      <p class="text-gray-400 text-center mb-8">
        Book safe and affordable bus tickets instantly
      </p>

      <div class="bg-[#161618] border border-[#2a2a2d] rounded-2xl shadow-2xl p-8">

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">

          <!-- Username -->
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Username</label>
            <input
              formControlName="username"
              type="text"
              placeholder="Enter username"
              class="w-full px-4 py-3 rounded-xl bg-[#0f0f10] border border-[#2a2a2d] text-white
                     focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F] outline-none"
            />
            @if (isInvalid('username')) {
              <p class="text-red-500 text-xs mt-1">Username is required</p>
            }
          </div>

          <!-- Password -->
          <div>
            <label class="text-xs text-gray-400 mb-1 block">Password</label>
            <div class="relative">
              <input
                formControlName="password"
                [type]="showPassword() ? 'text' : 'password'"
                placeholder="Enter password"
                class="w-full px-4 py-3 rounded-xl bg-[#0f0f10] border border-[#2a2a2d] text-white
                       focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F] outline-none"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#D32F2F] hover:underline"
                (click)="showPassword.update(v => !v)">
                {{ showPassword() ? 'Hide' : 'Show' }}
              </button>
            </div>
            @if (isInvalid('password')) {
              <p class="text-red-500 text-xs mt-1">Password must be at least 6 characters</p>
            }
          </div>

          <!-- Error message -->
          @if (errorMsg()) {
            <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {{ errorMsg() }}
            </div>
          }

          <!-- Submit -->
          <button
            type="submit"
            [disabled]="loading()"
            class="w-full py-3 rounded-xl font-semibold text-white
                   bg-gradient-to-r from-[#D32F2F] to-[#7f1d1d] hover:opacity-90 active:scale-95
                   transition disabled:opacity-50"
          >
            @if (loading()) {
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in...
              </span>
            } @else {
              Sign in
            }
          </button>

          <p class="text-center text-sm text-gray-500">
            New here? 
            <a routerLink="/auth/register" class="text-[#D32F2F] hover:underline font-medium">
              Create an account
            </a>
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
  showPassword = signal(false);

  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    const { username, password } = this.form.value;

    this.auth.login({ username: username!, password: password! }).subscribe({
      next: () => {
        this.toast.success('Welcome back!');
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? 'Invalid username or password.');
      },
    });
  }
}