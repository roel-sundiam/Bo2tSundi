import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, of, switchMap, map, catchError, finalize, startWith } from 'rxjs';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { AnalyticsService } from '../../core/services/analytics.service';
import { AppSummary, LoginRow, LoginsResponse, VisitRow, VisitsResponse } from '../../shared/models/event.model';

type ReportRange = 'daily' | 'weekly' | 'monthly';

interface ReportBucket {
  key: string;
  label: string;
  startMs: number;
  visits: number;
  logins: number;
  total: number;
}

interface AppRollup {
  appId: string;
  label: string;
  visits: number;
  logins: number;
  total: number;
}

interface ReportViewModel {
  range: ReportRange;
  from: Date;
  to: Date;
  buckets: ReportBucket[];
  appRollups: AppRollup[];
  totalVisits: number;
  totalLogins: number;
  totalEvents: number;
}

type TrendChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  fill: ApexFill;
  tooltip: ApexTooltip;
  grid: ApexGrid;
  colors: string[];
  legend: ApexLegend;
};

type BreakdownChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  grid: ApexGrid;
  colors: string[];
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [DatePipe, NgApexchartsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class ReportsComponent {
  private readonly analytics = inject(AnalyticsService);

  readonly loading = signal(false);
  readonly selectedRange = signal<ReportRange>('daily');

  readonly ranges: Array<{ key: ReportRange; label: string; hint: string }> = [
    { key: 'daily', label: 'Daily', hint: 'Last 30 days' },
    { key: 'weekly', label: 'Weekly', hint: 'Last 20 weeks' },
    { key: 'monthly', label: 'Monthly', hint: 'Last 12 months' },
  ];

  private readonly report$ = toObservable(this.selectedRange).pipe(
    startWith(this.selectedRange()),
    switchMap(range => {
      const now = new Date();
      const from = this.getRangeStart(range, now);
      this.loading.set(true);

      return combineLatest([
        this.analytics.getVisitsSince(String(from.getTime())),
        this.analytics.getLoginsSince(String(from.getTime())),
      ]).pipe(
        map(([visits, logins]) => this.buildReport(range, from, now, visits, logins)),
        catchError(() => of(this.buildReport(range, from, now, [], []))),
        finalize(() => this.loading.set(false))
      );
    })
  );

  readonly report = toSignal(this.report$, {
    initialValue: this.buildReport('daily', this.getRangeStart('daily', new Date()), new Date(), [], []),
  });

  readonly trendChart = computed<TrendChartOptions>(() => {
    const report = this.report();

    return {
      series: [
        { name: 'Visits', data: report.buckets.map(bucket => bucket.visits) },
        { name: 'Logins', data: report.buckets.map(bucket => bucket.logins) },
      ],
      chart: {
        type: 'area',
        height: 350,
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      xaxis: {
        categories: report.buckets.map(bucket => bucket.label),
        labels: { rotate: -30, style: { fontSize: '11px' } },
      },
      yaxis: {
        labels: {
          formatter: value => Math.round(value).toString(),
        },
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.25,
          opacityFrom: 0.42,
          opacityTo: 0.06,
          stops: [0, 90, 100],
        },
      },
      tooltip: {
        shared: true,
        intersect: false,
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4,
      },
      colors: ['#0ea5e9', '#22c55e'],
      legend: {
        position: 'top',
      },
    };
  });

  readonly appBreakdownChart = computed<BreakdownChartOptions>(() => {
    const report = this.report();

    return {
      series: [
        { name: 'Visits', data: report.appRollups.map(app => app.visits) },
        { name: 'Logins', data: report.appRollups.map(app => app.logins) },
      ],
      chart: {
        type: 'bar',
        height: 340,
        stacked: true,
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '48%',
        },
      },
      xaxis: {
        categories: report.appRollups.map(app => app.label),
        labels: { rotate: -20 },
      },
      yaxis: {
        labels: {
          formatter: value => Math.round(value).toString(),
        },
      },
      dataLabels: { enabled: false },
      tooltip: { shared: true, intersect: false },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 3,
      },
      colors: ['#38bdf8', '#4ade80'],
    };
  });

  setRange(range: ReportRange): void {
    this.selectedRange.set(range);
  }

  private buildReport(
    range: ReportRange,
    from: Date,
    to: Date,
    visitsInput: VisitsResponse | VisitRow[],
    loginsInput: LoginsResponse | LoginRow[]
  ): ReportViewModel {
    const visitRows = (Array.isArray(visitsInput) ? visitsInput : visitsInput.rows)
      .filter(row => this.isWithinRange(row.timestamp, from, to));
    const loginRows = (Array.isArray(loginsInput) ? loginsInput : loginsInput.rows)
      .filter(row => this.isWithinRange(row.timestamp, from, to));
    const visitSummary = Array.isArray(visitsInput) ? [] : visitsInput.summary;
    const loginSummary = Array.isArray(loginsInput) ? [] : loginsInput.summary;

    const buckets = this.createBuckets(range, to);
    const bucketByKey = new Map<string, ReportBucket>(buckets.map(bucket => [bucket.key, bucket]));

    for (const row of visitRows) {
      const key = this.getBucketKey(range, row.timestamp);
      if (!key) {
        continue;
      }
      const bucket = bucketByKey.get(key);
      if (!bucket) {
        continue;
      }
      bucket.visits += 1;
      bucket.total += 1;
    }

    for (const row of loginRows) {
      const key = this.getBucketKey(range, row.timestamp);
      if (!key) {
        continue;
      }
      const bucket = bucketByKey.get(key);
      if (!bucket) {
        continue;
      }
      bucket.logins += 1;
      bucket.total += 1;
    }

    const appRollups = this.buildAppRollups(visitRows, loginRows, visitSummary, loginSummary);
    const totalVisits = visitSummary.length > 0
      ? visitSummary.reduce((sum, row) => sum + row.count, 0)
      : visitRows.length;
    const totalLogins = loginSummary.length > 0
      ? loginSummary.reduce((sum, row) => sum + row.count, 0)
      : loginRows.length;

    return {
      range,
      from,
      to,
      buckets,
      appRollups,
      totalVisits,
      totalLogins,
      totalEvents: totalVisits + totalLogins,
    };
  }

  private createBuckets(range: ReportRange, to: Date): ReportBucket[] {
    if (range === 'daily') {
      return this.createDailyBuckets(to, 30);
    }
    if (range === 'weekly') {
      return this.createWeeklyBuckets(to, 20);
    }
    return this.createMonthlyBuckets(to, 12);
  }

  private createDailyBuckets(to: Date, days: number): ReportBucket[] {
    const now = this.atMidnight(to);
    const buckets: ReportBucket[] = [];

    for (let index = days - 1; index >= 0; index -= 1) {
      const point = new Date(now);
      point.setDate(point.getDate() - index);
      const key = this.dayKey(point);
      buckets.push({
        key,
        label: point.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        startMs: point.getTime(),
        visits: 0,
        logins: 0,
        total: 0,
      });
    }

    return buckets;
  }

  private createWeeklyBuckets(to: Date, weeks: number): ReportBucket[] {
    const thisWeekStart = this.startOfWeek(to);
    const buckets: ReportBucket[] = [];

    for (let index = weeks - 1; index >= 0; index -= 1) {
      const point = new Date(thisWeekStart);
      point.setDate(point.getDate() - index * 7);
      const key = this.weekKey(point);
      buckets.push({
        key,
        label: `Week of ${point.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        startMs: point.getTime(),
        visits: 0,
        logins: 0,
        total: 0,
      });
    }

    return buckets;
  }

  private createMonthlyBuckets(to: Date, months: number): ReportBucket[] {
    const thisMonthStart = this.startOfMonth(to);
    const buckets: ReportBucket[] = [];

    for (let index = months - 1; index >= 0; index -= 1) {
      const point = new Date(thisMonthStart);
      point.setMonth(point.getMonth() - index);
      const key = this.monthKey(point);
      buckets.push({
        key,
        label: point.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        startMs: point.getTime(),
        visits: 0,
        logins: 0,
        total: 0,
      });
    }

    return buckets;
  }

  private getBucketKey(range: ReportRange, timestamp: string): string | null {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    if (range === 'daily') {
      return this.dayKey(date);
    }
    if (range === 'weekly') {
      return this.weekKey(this.startOfWeek(date));
    }
    return this.monthKey(this.startOfMonth(date));
  }

  private buildAppRollupsFromRows(visitRows: VisitRow[], loginRows: LoginRow[]): AppRollup[] {
    const appMap = new Map<string, AppRollup>();

    for (const row of visitRows) {
      const app = this.ensureApp(appMap, row.appId);
      app.visits += 1;
      app.total += 1;
    }

    for (const row of loginRows) {
      const app = this.ensureApp(appMap, row.appId);
      app.logins += 1;
      app.total += 1;
    }

    return [...appMap.values()].sort((left, right) => right.total - left.total);
  }

  private buildAppRollups(
    visitRows: VisitRow[],
    loginRows: LoginRow[],
    visitSummary: AppSummary[],
    loginSummary: AppSummary[]
  ): AppRollup[] {
    if (visitSummary.length > 0 || loginSummary.length > 0) {
      return this.buildAppRollupsFromSummary(visitSummary, loginSummary);
    }

    return this.buildAppRollupsFromRows(visitRows, loginRows);
  }

  private buildAppRollupsFromSummary(visitSummary: AppSummary[], loginSummary: AppSummary[]): AppRollup[] {
    const appMap = new Map<string, AppRollup>();

    for (const row of visitSummary) {
      const app = this.ensureApp(appMap, row._id);
      app.visits += row.count;
      app.total += row.count;
    }

    for (const row of loginSummary) {
      const app = this.ensureApp(appMap, row._id);
      app.logins += row.count;
      app.total += row.count;
    }

    return [...appMap.values()].sort((left, right) => right.total - left.total);
  }

  private ensureApp(appMap: Map<string, AppRollup>, appId: string): AppRollup {
    const key = appId.toLowerCase();
    const existing = appMap.get(key);
    if (existing) {
      return existing;
    }

    const created: AppRollup = {
      appId: key,
      label: this.displayAppName(key),
      visits: 0,
      logins: 0,
      total: 0,
    };
    appMap.set(key, created);
    return created;
  }

  private isWithinRange(timestamp: string, from: Date, to: Date): boolean {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
  }

  private getRangeStart(range: ReportRange, now: Date): Date {
    if (range === 'daily') {
      const d = this.atMidnight(now);
      d.setDate(d.getDate() - 29);
      return d;
    }

    if (range === 'weekly') {
      const d = this.startOfWeek(now);
      d.setDate(d.getDate() - 19 * 7);
      return d;
    }

    const d = this.startOfMonth(now);
    d.setMonth(d.getMonth() - 11);
    return d;
  }

  private startOfWeek(input: Date): Date {
    const d = this.atMidnight(input);
    const offset = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - offset);
    return d;
  }

  private startOfMonth(input: Date): Date {
    const d = this.atMidnight(input);
    d.setDate(1);
    return d;
  }

  private atMidnight(input: Date): Date {
    const d = new Date(input);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private dayKey(input: Date): string {
    return `${input.getFullYear()}-${input.getMonth() + 1}-${input.getDate()}`;
  }

  private weekKey(input: Date): string {
    return `${input.getFullYear()}-W${this.isoWeekNumber(input)}`;
  }

  private monthKey(input: Date): string {
    return `${input.getFullYear()}-${input.getMonth() + 1}`;
  }

  private isoWeekNumber(input: Date): number {
    const date = new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private displayAppName(appId: string): string {
    const labels: Record<string, string> = {
      pvtennisclub: 'Punta Verde Tennis Club',
      sheservestc: 'SheServes Tennis Club',
      rt2tennisclub: 'RT2 Tennis Club',
      rctennisacademy: 'RC Tennis Academy',
      tennismarketplace: 'Tennis Marketplace',
    };

    return labels[appId] ?? appId;
  }
}
