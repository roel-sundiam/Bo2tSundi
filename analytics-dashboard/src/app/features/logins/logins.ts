import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../core/services/analytics.service';

@Component({
  selector: 'app-logins',
  standalone: true,
  imports: [DatePipe, MatTableModule, MatSortModule, FormsModule],
  templateUrl: './logins.html',
  styleUrl: './logins.scss',
})
export class LoginsComponent {
  private analytics = inject(AnalyticsService);
  private raw = toSignal(this.analytics.logins$);
  readonly pvTennisClubName = 'Punta Verde Tennis Club';

  selectedApp = signal<string>('');
  displayedColumns = ['userId', 'appId', 'timestamp'];

  appList = computed(() =>
    (this.raw()?.summary ?? []).map(s => s._id).sort()
  );

  filteredRows = computed(() => {
    const data = this.raw();
    if (!data) return [];
    const app = this.selectedApp();
    return app ? data.rows.filter(r => r.appId === app) : data.rows;
  });

  total = computed(() => this.filteredRows().length);

  activeApps = computed(() => this.appList().length);

  latestLoginTimestamp = computed(() => {
    const rows = this.filteredRows();
    if (rows.length === 0) return null;

    let latest: string | null = null;
    for (const row of rows) {
      const current = row.timestamp;
      if (!latest || Date.parse(current) > Date.parse(latest)) {
        latest = current;
      }
    }
    return latest;
  });

  selectedAppLabel = computed(() => {
    const selected = this.selectedApp();
    return selected ? this.displayAppName(selected) : 'All Apps';
  });

  refresh(): void {
    this.analytics.refresh();
  }

  displayAppName(appId: string): string {
    if (appId.toLowerCase() === 'pvtennisclub') return this.pvTennisClubName;
    if (appId.toLowerCase() === 'sheservestc') return 'SheServes Tennis Club';
    if (appId.toLowerCase() === 'rctennisacademy') return 'RC Tennis Academy';
    if (appId.toLowerCase() === 'tenisuapp') return 'Tenisu Tennis Club';
    return appId;
  }
}
