import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  dark = signal<boolean>(false);

  constructor() {
    const saved = localStorage.getItem('swiftroute-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    this.dark.set(isDark);
    this.apply(isDark);

    effect(() => {
      const d = this.dark();
      this.apply(d);
      localStorage.setItem('swiftroute-theme', d ? 'dark' : 'light');
    });
  }

  toggle() { this.dark.update(d => !d); }

  private apply(dark: boolean) {
    document.documentElement.classList.toggle('dark', dark);
  }
}
