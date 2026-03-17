import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  private counter = 0;

  show(message: string, type: ToastType = 'info', duration = 4000): void {
    const id = ++this.counter;
    this._toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.remove(id), duration);
  }

  success(message: string) { this.show(message, 'success'); }
  error(message: string) { this.show(message, 'error'); }
  info(message: string) { this.show(message, 'info'); }
  warning(message: string) { this.show(message, 'warning'); }

  remove(id: number): void {
    this._toasts.update(t => t.filter(x => x.id !== id));
  }
}