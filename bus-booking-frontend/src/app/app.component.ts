import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { ToastContainerComponent } from './shared/toast/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, ToastContainerComponent],
  template: `
    <app-navbar />
    <main class="min-h-screen bg-slate-50">
      <router-outlet />
    </main>
    <app-toast-container />
  `,
})
export class AppComponent {}