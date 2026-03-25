import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  template: `
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-lg">

      <!-- Logo -->
      <div class="text-center mb-8">
        <a routerLink="/home" class="inline-flex items-center gap-2.5">
          <div class="w-11 h-11 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM4 11V9l1-4h14l1 4v2H4z"/>
            </svg>
          </div>
          <span class="text-2xl font-extrabold text-slate-900 dark:text-white">BusGo</span>
        </a>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white mt-5">Get started free</h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1.5">Join 2 million+ travelers on BusGo</p>
      </div>

      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-7 sm:p-8">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="form-label">First Name</label>
              <input formControlName="fullName" type="text" placeholder="John Doe" class="form-input dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
              @if (isInvalid('fullName')) {
                <p class="form-error"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>Required</p>
              }
            </div>
            <div>
              <label class="form-label">Username</label>
              <input formControlName="username" type="text" placeholder="johndoe" class="form-input dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
              @if (isInvalid('username')) {
                <p class="form-error"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>Required</p>
              }
            </div>
          </div>

          <div>
            <label class="form-label">Email Address</label>
            <input formControlName="email" type="email" placeholder="john@example.com" class="form-input dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
            @if (isInvalid('email')) {
              <p class="form-error"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>Valid email required</p>
            }
          </div>

          <div>
            <label class="form-label">Phone Number</label>
            <input type="tel" placeholder="+91 98765 43210" class="form-input dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
          </div>

          <div>
            <label class="form-label">Password</label>
            <div class="relative">
              <input formControlName="password" [type]="showPwd() ? 'text' : 'password'" placeholder="Min. 6 characters" class="form-input pr-12 dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
              <button type="button" (click)="showPwd.update(v=>!v)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                @if (showPwd()) {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                }
              </button>
            </div>
            @if (isInvalid('password')) {
              <p class="form-error"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>Min. 6 characters</p>
            }
          </div>

          <div>
            <label class="form-label">Account Type</label>
            <div class="grid grid-cols-2 gap-3">
              @for (r of roles; track r.value) {
                <label class="flex items-center gap-3 p-4 border-2 rounded-2xl cursor-pointer transition-all"
                  [class]="form.get('role')?.value === r.value ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-700'">
                  <input type="radio" formControlName="role" [value]="r.value" class="sr-only"/>
                  <span class="text-2xl">{{ r.icon }}</span>
                  <div>
                    <p class="text-sm font-bold text-slate-800 dark:text-white">{{ r.label }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ r.desc }}</p>
                  </div>
                </label>
              }
            </div>
          </div>

          @if (form.get('role')?.value === 'Operator') {
            <div class="p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-2xl flex items-start gap-3">
              <svg class="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Operator accounts require <strong class="text-slate-800 dark:text-white">admin approval</strong> before you can add buses or schedules.
                You'll be registered as a <strong class="text-slate-800 dark:text-white">Pending Operator</strong> and can login, but full access is granted once approved.
              </p>
            </div>
          }

          @if (errorMsg()) {
            <div class="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
              <p class="text-sm text-red-700">{{ errorMsg() }}</p>
            </div>
          }

          <button type="submit" [disabled]="loading()" class="btn-primary w-full py-3.5 text-base rounded-2xl shadow-lg shadow-red-200">
            @if (loading()) {
              <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Creating account…
            } @else { Create My Account }
          </button>

          <p class="text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?
            <a routerLink="/auth/login" class="text-red-600 font-bold hover:underline ml-1">Log in here</a>
          </p>
        </form>
      </div>
    </div>
  </div>
  `,
})
export class RegisterComponent {
  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  loading  = signal(false);
  errorMsg = signal('');
  showPwd  = signal(false);

  roles = [
    { value: 'Customer', label: 'Traveller',    icon: '🧳', desc: 'Book bus tickets'  },
    { value: 'Operator', label: 'Bus Operator', icon: '🚌', desc: 'Manage your fleet · Needs admin approval' },
  ];

  form = this.fb.group({
    fullName: ['', Validators.required],
    username: ['', Validators.required],
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role:     ['Customer'],
  });

  isInvalid(f: string) { const c = this.form.get(f); return !!(c?.invalid && c?.touched); }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true); this.errorMsg.set('');
    const v = this.form.value;
    this.auth.register({ fullName: v.fullName!, username: v.username!, email: v.email!, password: v.password!, role: v.role as any }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.role === 'PendingOperator') {
          this.toast.success('Application submitted! Awaiting admin approval. 🕐');
          this.router.navigate(['/auth/pending-approval']);
        } else if (res.role === 'Admin') {
          this.toast.success('Welcome, Admin!');
          this.router.navigate(['/admin']);
        } else if (res.role === 'Operator') {
          this.toast.success('Welcome to BusGo! 🎉');
          this.router.navigate(['/operator']);
        } else {
          this.toast.success('Account created! Welcome to BusGo 🎉');
          this.router.navigate(['/home']);
        }
      },
      error: (err) => { this.loading.set(false); this.errorMsg.set(err.error?.message ?? 'Registration failed. Please try again.'); },
    });
  }
}