import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-xl">
        <div class="card card-soft">
          <div class="card-body">
            <!-- Header -->
            <div class="text-center mb-6">
              <div class="w-14 h-14 bg-[var(--graphite)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8z"/>
                </svg>
              </div>
              <h1 class="text-2xl font-extrabold tracking-tight">Welcome back</h1>
              <p class="text-muted mt-1">Sign in to continue</p>
            </div>

            <!-- Form -->
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
              <div>
                <label class="label">Username</label>
                <input formControlName="username" type="text" placeholder="yourname" class="input" />
                @if (isInvalid('username')) {
                  <p class="mt-1 text-xs text-red-600">Username is required</p>
                }
              </div>

              <div>
                <label class="label">Password</label>
                <input formControlName="password" [type]="showPassword() ? 'text' : 'password'"
                       placeholder="Min 6 characters" class="input" />
                @if (isInvalid('password')) {
                  <p class="mt-1 text-xs text-red-600">Password must be at least 6 characters</p>
                }
                <button type="button"
                        class="mt-2 text-xs text-[var(--accent)] hover:underline"
                        (click)="showPassword.update(v => !v)">
                  {{ showPassword() ? 'Hide' : 'Show' }} password
                </button>
              </div>

              @if (errorMsg()) {
                <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <svg class="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p class="text-sm text-red-700">{{ errorMsg() }}</p>
                </div>
              }

              <button type="submit" [disabled]="loading()" class="btn btn-primary w-full">
                @if (loading()) {
                  <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Signing in...
                } @else {
                  Sign in
                }
              </button>

              <p class="text-center text-sm text-muted mt-3">
                New here?
                <a routerLink="/auth/register" class="text-[var(--accent)] hover:underline ml-1">Create an account</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  loading = signal(false);
  errorMsg = signal('');
  showPassword = signal(false);

  form = this.fb.group({
    username: ['', [Validators.required]],
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
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? 'Invalid username or password.');
      },
    });
  }
}