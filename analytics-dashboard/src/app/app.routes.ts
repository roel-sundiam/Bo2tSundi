import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
  },
  {
    path: 'visits',
    loadComponent: () =>
      import('./features/visits/visits').then(m => m.VisitsComponent),
  },
  {
    path: 'logins',
    loadComponent: () =>
      import('./features/logins/logins').then(m => m.LoginsComponent),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
