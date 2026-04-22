import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../core/services/analytics.service';

@Component({
  selector: 'app-visits',
  standalone: true,
  imports: [DatePipe, MatTableModule, MatSortModule, MatFormFieldModule, MatSelectModule, FormsModule],
  templateUrl: './visits.html',
  styleUrl: './visits.scss',
})
export class VisitsComponent {
  private analytics = inject(AnalyticsService);
  private raw = toSignal(this.analytics.visits$);

  selectedApp = signal<string>('');
  displayedColumns = ['appId', 'page', 'timestamp'];

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
}
