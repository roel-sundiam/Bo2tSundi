import { Component, inject, signal, computed } from '@angular/core';
import { combineLatest, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AppSummary } from '../../shared/models/event.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatFormFieldModule, MatSelectModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  private analytics = inject(AnalyticsService);

  selectedApp = signal<string>('');

  private raw$ = combineLatest([this.analytics.visits$, this.analytics.logins$]).pipe(
    map(([visits, logins]) => {
      const allApps = Array.from(
        new Set([...visits.summary.map(s => s._id), ...logins.summary.map(s => s._id)])
      ).sort();
      return { visits, logins, allApps };
    })
  );

  private raw = toSignal(this.raw$);

  appList = computed(() => this.raw()?.allApps ?? []);

  vm = computed(() => {
    const data = this.raw();
    if (!data) return null;

    const app = this.selectedApp();
    const { visits, logins } = data;

    const visitsByApp = app
      ? visits.summary.filter(s => s._id === app)
      : visits.summary;

    const loginsByApp = app
      ? logins.summary.filter(s => s._id === app)
      : logins.summary;

    const totalVisits = visitsByApp.reduce((sum, s) => sum + s.count, 0);
    const totalLogins = loginsByApp.reduce((sum, s) => sum + s.count, 0);

    return { totalVisits, totalLogins, visitsByApp, loginsByApp };
  });
}
