import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pass = control.get('password');
  const confirm = control.get('confirmPassword');
  return pass && confirm && pass.value !== confirm.value ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="card card-soft">
          <div class="card-body">
            <!-- Header -->
            <div class="text-center mb-6">
              <div class="w-14 h-14 bg-[var(--graphite)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                </svg>
              </div>
              <h1 class="text-2xl font-extrabold tracking-tight">Create account</h1>
              <p class="text-muted mt-1">Join BusGo and start booking</p>
            </div>

            <!-- Form -->
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
              <div>
                <label class="label">Full Name</label>
                <input formControlName="fullName" type="text" placeholder="John Doe" class="input" />
                @if (isInvalid('fullName')) { <p class="mt-1 text-xs text-red-600">Full name is required</p> }
              </div>

              <div>
                <label class="label">Email</label>
                <input formControlName="email" type="email" placeholder="you@example.com" class="input" />
                @if (isInvalid('email')) { <p class="mt-1 text-xs text-red-600">A valid email is required</p> }
              </div>

              <div>
                <label class="label">Username</label>
                <input formControlName="username" type="text" placeholder="johndoe" class="input" />
                @if (isInvalid('username')) { <p class="mt-1 text-xs text-red-600">Username is required</p> }
              </div>

              <!-- Role -->
              <div>
                <label class="label">Account Type</label>
                <div class="grid grid-cols-2 gap-2">
                  @for (r of roles; track r.value) {
                    <label class="relative cursor-pointer">
                      <input type="radio" formControlName="role" [value]="r.value" class="sr-only"/>
                      <div class="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all"
                           [class]="form.get('role')?.value === r.value
                                   ? 'border-[var(--accent)] bg-[rgba(106,90,249,0.08)] text-[var(--graphite)]'
                                   : 'border-[var(--border)] text-[var(--graphite)] hover:bg-[#F7F7F7]'">
                        <span>{{ r.icon }}</span>
                        <span>{{ r.label }}</span>
                      </div>
                    </label>
                  }
                </div>
              </div>

              <div>
                <label class="label">Password</label>
                <input formControlName="password" type="password" placeholder="Min 6 characters" class="input" />
                @if (isInvalid('password')) { <p class="mt-1 text-xs text-red-600">Password must be at least 6 characters</p> }
              </div>

              <div>
                <label class="label">Confirm Password</label>
                <input formControlName="confirmPassword" type="password" placeholder="Repeat password" class="input"
                       [class.border-red-300]="form.errors?.['passwordMismatch'] && form.get('confirmPassword')?.touched"/>
                @if (form.errors?.['passwordMismatch'] && form.get('confirmPassword')?.touched) {
                  <p class="mt-1 text-xs text-red-600">Passwords do not match</p>
                }
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
                  Creating account...
                } @else {
                  Create account
                }
              </button>

              <p class="text-center text-sm text-muted mt-3">
                Already have an account?
                <a routerLink="/auth/login" class="text-[var(--accent)] hover:underline ml-1">Sign in</a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  loading = signal(false);
  errorMsg = signal('');

  roles = [
    { value: 'Customer', label: 'Customer', icon: '🧳' },
    { value: 'Operator', label: 'Operator', icon: '🚌' },
  ] as const;

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    username: ['', [Validators.required, Validators.maxLength(100)]],
    role: ['Customer', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordMatchValidator });

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
    const { fullName, email, username, role, password } = this.form.value;

    const narrowedRole = (role! as 'Customer' | 'Operator' | 'Admin');

    this.auth.register({
      fullName: fullName!,
      email: email!,
      username: username!,
      role: narrowedRole,
      password: password!,
    }).subscribe({
      next: () => {
        this.toast.success('Account created! Welcome to BusGo 🎉');
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? err.error ?? 'Registration failed. Please try again.');
      },
    });
  }
}
