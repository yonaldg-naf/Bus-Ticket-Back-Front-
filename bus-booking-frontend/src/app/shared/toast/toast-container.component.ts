import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-slide-in"
          [class]="toastClass(toast.type)">
          <span class="mt-0.5 flex-shrink-0">{{ toastIcon(toast.type) }}</span>
          <span class="flex-1">{{ toast.message }}</span>
          <button (click)="toastService.remove(toast.id)"
            class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity text-base leading-none">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .animate-slide-in { animation: slide-in 0.25s ease-out; }
  `],
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  toastClass(type: string): string {
    const map: Record<string, string> = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error:   'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-amber-50 border-amber-200 text-amber-800',
      info:    'bg-blue-50 border-blue-200 text-blue-800',
    };
    return map[type] ?? map['info'];
  }

  toastIcon(type: string): string {
    const map: Record<string, string> = {
      success: '✓', error: '✕', warning: '⚠', info: 'ℹ',
    };
    return map[type] ?? 'ℹ';
  }
}