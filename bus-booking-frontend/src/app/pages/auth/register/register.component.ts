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
  <div class="min-h-screen flex items-center justify-center bg-[#0f0f10] px-4 py-12 relative overflow-hidden">

    <!-- Background glow -->
    <div class="absolute w-[500px] h-[500px] bg-[#D32F2F]/20 blur-[120px] rounded-full -top-20 -left-20"></div>
    <div class="absolute w-[400px] h-[400px] bg-[#ff5252]/10 blur-[100px] rounded-full bottom-0 right-0"></div>

    <div class="w-full max-w-md">

      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white">Create account</h1>
        <p class="text-gray-400 text-sm mt-2">Join BusGo and start booking</p>
      </div>

      <!-- Card -->
      <div class="bg-[#161618] border border-[#2a2a2d] shadow-2xl rounded-2xl p-8">

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">

          <!-- Full Name -->
          <div>
            <label class="text-xs text-gray-400">Full Name</label>
            <input formControlName="fullName" type="text" placeholder="John Doe"
              class="w-full mt-1 px-4 py-3 rounded-lg bg-[#0f0f10] border border-[#2a2a2d]
                     text-white placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-[#D32F2F]" />
            @if (isInvalid('fullName')) {
              <p class="text-xs text-red-500 mt-1">Full name is required</p>
            }
          </div>

          <!-- Email -->
          <div>
            <label class="text-xs text-gray-400">Email</label>
            <input formControlName="email" type="email" placeholder="you@example.com"
              class="w-full mt-1 px-4 py-3 rounded-lg bg-[#0f0f10] border border-[#2a2a2d]
                     text-white placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-[#D32F2F]" />
            @if (isInvalid('email')) {
              <p class="text-xs text-red-500 mt-1">Valid email required</p>
            }
          </div>

          <!-- Username -->
          <div>
            <label class="text-xs text-gray-400">Username</label>
            <input formControlName="username" type="text" placeholder="johndoe"
              class="w-full mt-1 px-4 py-3 rounded-lg bg-[#0f0f10] border border-[#2a2a2d]
                     text-white placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-[#D32F2F]" />
            @if (isInvalid('username')) {
              <p class="text-xs text-red-500 mt-1">Username is required</p>
            }
          </div>

          <!-- Role -->
          <div>
            <label class="text-xs text-gray-400">Account Type</label>

            <div class="grid grid-cols-2 gap-3 mt-2">
              @for (r of roles; track r.value) {
                <label class="cursor-pointer">
                  <input type="radio" formControlName="role" [value]="r.value" class="hidden" />

                  <div class="px-4 py-3 rounded-lg text-sm flex items-center gap-2 justify-center
                              border transition"
                       [class]="form.get('role')?.value === r.value
                         ? 'bg-[#D32F2F]/20 border-[#D32F2F] text-white'
                         : 'bg-[#0f0f10] border-[#2a2a2d] text-gray-400 hover:border-gray-500'">

                    <span>{{ r.icon }}</span>
                    <span>{{ r.label }}</span>
                  </div>
                </label>
              }
            </div>
          </div>

          <!-- Password -->
          <div>
            <label class="text-xs text-gray-400">Password</label>
            <input formControlName="password" type="password" placeholder="Min 6 characters"
              class="w-full mt-1 px-4 py-3 rounded-lg bg-[#0f0f10] border border-[#2a2a2d]
                     text-white placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-[#D32F2F]" />
            @if (isInvalid('password')) {
              <p class="text-xs text-red-500 mt-1">Minimum 6 characters</p>
            }
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="text-xs text-gray-400">Confirm Password</label>
            <input formControlName="confirmPassword" type="password" placeholder="Repeat password"
              class="w-full mt-1 px-4 py-3 rounded-lg bg-[#0f0f10] border border-[#2a2a2d]
                     text-white placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-[#D32F2F]" />

            @if (form.errors?.['passwordMismatch'] && form.get('confirmPassword')?.touched) {
              <p class="text-xs text-red-500 mt-1">Passwords do not match</p>
            }
          </div>

          <!-- Error -->
          @if (errorMsg()) {
            <div class="bg-red-900/20 border border-red-700 text-red-400 text-sm p-3 rounded-lg">
              {{ errorMsg() }}
            </div>
          }

          <!-- Button -->
          <button type="submit" [disabled]="loading()"
            class="w-full py-3 rounded-lg font-semibold text-white
                   bg-gradient-to-r from-[#D32F2F] to-[#7f1d1d]
                   hover:opacity-90 active:scale-95
                   transition shadow-lg disabled:opacity-50">

            @if (loading()) {
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="white" stroke-width="3" fill="none"/>
                </svg>
                Creating account...
              </span>
            } @else {
              Create account
            }
          </button>

          <!-- Footer -->
          <p class="text-center text-sm text-gray-500 mt-2">
            Already have an account?
            <a routerLink="/auth/login" class="text-[#ff5252] hover:underline ml-1">
              Sign in
            </a>
          </p>

        </form>
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
        this.errorMsg.set(err.error?.message ?? err.error ?? 'Registration failed.');
      },
    });
  }
}