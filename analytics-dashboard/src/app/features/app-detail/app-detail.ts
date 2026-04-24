import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { AnalyticsService } from '../../core/services/analytics.service';
import { RegistrationsResponse, ReservationRT2Row, PaymentRT2Row, SheServesFinanceSummary } from '../../shared/models/event.model';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, MatTableModule, MatCardModule, MatButtonModule, MatIconModule, MatTabsModule],
  templateUrl: './app-detail.html',
  styleUrl: './app-detail.scss',
})
export class AppDetailComponent {
  private route = inject(ActivatedRoute);
  private analytics = inject(AnalyticsService);

  appId = this.route.snapshot.paramMap.get('appId') ?? '';
  isPvTennisClub = this.appId.toLowerCase() === 'pvtennisclub';
  isSheServesTC = this.appId.toLowerCase() === 'sheservestc';
  isRT2TennisClub = this.appId.toLowerCase() === 'rt2tennisclub';
  isRCTennisAcademy = this.appId.toLowerCase() === 'rctennisacademy';
  isTennisMarketplace = this.appId.toLowerCase() === 'tennismarketplace';
  readonly pvTennisClubName = 'Punta Verde Tennis Club';
  readonly tennisMarketplaceName = 'Tennis Marketplace';

  visitColumns = ['page', 'timestamp'];
  visitColumnsRT2 = ['userId', 'page', 'timestamp'];
  loginColumns = ['userId', 'timestamp'];

  readonly regColumns = [
    'Timestamp',
    'Full name ',
    'Age',
    'Contact number',
    'City/Location (ex. Angeles City)',
    'Email Address',
  ];

  registrations = signal<{ columns: string[]; rows: Record<string, string>[] }>({ columns: [], rows: [] });
  sheServesFinance = signal<SheServesFinanceSummary | null>(null);
  reservationsRT2 = signal<ReservationRT2Row[]>([]);
  reservationColumns = ['bookedBy', 'date', 'time', 'players', 'status', 'totalFee'];
  paymentsRT2 = signal<PaymentRT2Row[]>([]);
  paymentColumns = ['paidBy', 'amount', 'paymentMethod', 'description', 'status', 'paymentDate'];

  private raw$ = combineLatest([this.analytics.visits$, this.analytics.logins$]).pipe(
    map(([visits, logins]) => ({
      visits: visits.rows.filter(r => r.appId === this.appId),
      logins: logins.rows.filter(r => r.appId === this.appId),
      totalVisits: visits.summary.find(s => s._id === this.appId)?.count ?? 0,
      totalLogins: logins.summary.find(s => s._id === this.appId)?.count ?? 0,
    }))
  );

  data = toSignal(this.raw$);

  constructor() {
    if (this.isSheServesTC) {
      this.analytics.getRegistrations().subscribe(r => {
        const visibleCols = this.regColumns.filter(c => r.columns.includes(c));
        const latest = r.rows.slice(-10).reverse();
        this.registrations.set({ columns: visibleCols, rows: latest });
      });
      this.analytics.getSheServesFinance().subscribe(f => this.sheServesFinance.set(f));
    }
    if (this.isRT2TennisClub) {
      this.analytics.getReservationsRT2().subscribe(r => this.reservationsRT2.set(r.rows));
      this.analytics.getPaymentsRT2().subscribe(r => this.paymentsRT2.set(r.rows));
    }
  }

  formatTimeSlot(slot: number): string {
    const hour = slot % 12 || 12;
    const ampm = slot < 12 ? 'AM' : 'PM';
    return `${hour}:00 ${ampm}`;
  }

  displayAppName(appId: string): string {
    if (appId.toLowerCase() === 'pvtennisclub') return this.pvTennisClubName;
    if (appId.toLowerCase() === 'sheservestc') return 'SheServes Tennis Club';
    if (appId.toLowerCase() === 'rt2tennisclub') return 'RT2 Tennis Club';
    if (appId.toLowerCase() === 'rctennisacademy') return 'RC Tennis Academy';
    if (appId.toLowerCase() === 'tennismarketplace') return this.tennisMarketplaceName;
    return appId;
  }

  latestEventTimestamp(rows: Array<{ timestamp: string }>): string | null {
    if (rows.length === 0) {
      return null;
    }

    let latest: string | null = null;
    for (const row of rows) {
      const value = row.timestamp;
      if (!latest || Date.parse(value) > Date.parse(latest)) {
        latest = value;
      }
    }

    return latest;
  }

  latestReservationDate(): string | null {
    return this.latestDateValue(this.reservationsRT2().map(row => row.date));
  }

  latestPaymentDate(): string | null {
    return this.latestDateValue(this.paymentsRT2().map(row => row.paymentDate));
  }

  pendingReservationsCount(): number {
    return this.reservationsRT2().filter(
      row => this.isPendingStatus(row.status) || this.isPendingStatus(row.paymentStatus)
    ).length;
  }

  pendingPaymentsCount(): number {
    return this.paymentsRT2().filter(row => this.isPendingStatus(row.status)).length;
  }

  totalPaidAmount(): number {
    return this.paymentsRT2()
      .filter(row => this.isPaidStatus(row.status))
      .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }

  formatAmount(value: number): string {
    return value.toLocaleString('en-PH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  private latestDateValue(values: string[]): string | null {
    let latest: string | null = null;

    for (const value of values) {
      if (!latest || Date.parse(value) > Date.parse(latest)) {
        latest = value;
      }
    }

    return latest;
  }

  private isPendingStatus(status: string): boolean {
    const normalized = status.toLowerCase();
    return (
      normalized.includes('pending')
      || normalized.includes('unpaid')
      || normalized.includes('processing')
      || normalized.includes('for payment')
    );
  }

  private isPaidStatus(status: string): boolean {
    const normalized = status.toLowerCase();
    return (
      normalized.includes('paid')
      || normalized.includes('completed')
      || normalized.includes('success')
      || normalized.includes('confirmed')
    );
  }
}
