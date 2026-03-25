import { Routes } from '@angular/router';
import { authGuard, noAuthGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'auth',
    children: [
      { path: 'login',    canActivate: [noAuthGuard], loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', canActivate: [noAuthGuard], loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: 'pending-approval', canActivate: [authGuard], loadComponent: () => import('./pages/auth/pending-approval/pending-approval.component').then(m => m.PendingApprovalComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search-results/search-results.component').then(m => m.SearchResultsComponent),
  },
  {
    path: 'booking',
    canActivate: [authGuard],
    children: [
      { path: 'seats/:scheduleId',    loadComponent: () => import('./pages/booking/seat-selection/seat-selection.component').then(m => m.SeatSelectionComponent) },
      { path: 'passengers/:scheduleId', loadComponent: () => import('./pages/booking/passenger-form/passenger-form.component').then(m => m.PassengerFormComponent) },
      { path: 'confirm/:bookingId',   loadComponent: () => import('./pages/booking/booking-confirm/booking-confirm.component').then(m => m.BookingConfirmComponent) },
    ],
  },
  {
    path: 'my-bookings',
    canActivate: [authGuard],
    children: [
      { path: '',    loadComponent: () => import('./pages/my-bookings/booking-list/booking-list.component').then(m => m.BookingListComponent) },
      { path: ':id', loadComponent: () => import('./pages/my-bookings/booking-detail/booking-detail.component').then(m => m.BookingDetailComponent) },
    ],
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'operator',
    canActivate: [authGuard, roleGuard('Operator', 'Admin')],
    children: [
      { path: '',            loadComponent: () => import('./pages/operator/operator-dashboard/operator-dashboard.component').then(m => m.OperatorDashboardComponent) },
      { path: 'buses',       loadComponent: () => import('./pages/operator/manage-buses/manage-buses.component').then(m => m.ManageBusesComponent) },
      { path: 'routes',      loadComponent: () => import('./pages/operator/manage-routes/manage-routes.component').then(m => m.ManageRoutesComponent) },
      { path: 'schedules',   loadComponent: () => import('./pages/operator/manage-schedules/manage-schedules.component').then(m => m.ManageSchedulesComponent) },
      { path: 'analytics',       loadComponent: () => import('./pages/operator/analytics/analytics.component').then(m => m.AnalyticsComponent) },
      { path: 'promo-codes',     loadComponent: () => import('./pages/operator/promo-codes/promo-codes.component').then(m => m.PromoCodesComponent) },
      { path: 'announcements',   loadComponent: () => import('./pages/operator/announcements/announcements.component').then(m => m.AnnouncementsComponent) },
      { path: 'manifest',        loadComponent: () => import('./pages/operator/passenger-manifest/passenger-manifest.component').then(m => m.PassengerManifestComponent) },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('Admin')],
    children: [
      { path: '',                    loadComponent: () => import('./pages/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'stops',               loadComponent: () => import('./pages/admin/manage-stops/manage-stops.component').then(m => m.ManageStopsComponent) },
      { path: 'audit-logs',          loadComponent: () => import('./pages/admin/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent) },
      { path: 'operator-approvals',  loadComponent: () => import('./pages/admin/operator-approvals/operator-approvals.component').then(m => m.OperatorApprovalsComponent) },
      { path: 'manage-users',        loadComponent: () => import('./pages/admin/manage-users/manage-users.component').then(m => m.ManageUsersComponent) },
      { path: 'operator-performance',loadComponent: () => import('./pages/admin/operator-performance/operator-performance.component').then(m => m.OperatorPerformanceComponent) },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];