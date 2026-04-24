import { Component, inject, computed, signal, effect, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { combineLatest, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AnalyticsService } from '../../core/services/analytics.service';
import { LoginRow, VisitRow } from '../../shared/models/event.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, MatCardModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnDestroy {
  private analytics = inject(AnalyticsService);

  readonly pvTennisClubId = 'pvtennisclub';

  registrationCount = signal(0);
  lastRefreshed = signal<Date | null>(null);

  private readonly HIGHLIGHT_MS = 5 * 60 * 1000;
  private prevCounts = new Map<string, { visits: number; logins: number }>();
  private lastChangedAt = new Map<string, number>();
  private newEventCount = new Map<string, number>();
  private badgeClearsAt = new Map<string, number>();
  private readonly appToneProfiles: Record<string, { notes: number[]; type: OscillatorType; gain: number }> = {
    pvtennisclub: { notes: [392.0, 523.25, 659.25], type: 'triangle', gain: 0.18 },
    sheservestc: { notes: [493.88, 587.33, 739.99], type: 'sine', gain: 0.16 },
    rt2tennisclub: { notes: [329.63, 440.0, 659.25], type: 'square', gain: 0.12 },
    rctennisacademy: { notes: [349.23, 466.16, 622.25], type: 'sawtooth', gain: 0.1 },
    tennismarketplace: { notes: [440.0, 554.37, 659.25], type: 'sine', gain: 0.15 },
    tenisuapp: { notes: [369.99, 493.88, 622.25], type: 'sine', gain: 0.14 },
  };

  private audioCtx = new AudioContext();
  private readonly unlockAudio = () => this.audioCtx.resume();

  constructor() {
    this.analytics.getRegistrations().subscribe(r => this.registrationCount.set(r.rows.length));
    this.analytics.startActivityPolling();
    document.addEventListener('click', this.unlockAudio, { once: true });

    effect(() => {
      const apps = this.apps();
      const changedApps: string[] = [];
      for (const app of apps) {
        const prev = this.prevCounts.get(app.appId);
        if (prev && (app.visits > prev.visits || app.logins > prev.logins)) {
          const delta = (app.visits - prev.visits) + (app.logins - prev.logins);
          this.lastChangedAt.set(app.appId, Date.now());
          this.newEventCount.set(app.appId, (this.newEventCount.get(app.appId) ?? 0) + delta);
          this.badgeClearsAt.set(app.appId, Date.now() + this.HIGHLIGHT_MS);
          changedApps.push(app.appId);
        }
        this.prevCounts.set(app.appId, { visits: app.visits, logins: app.logins });
      }
      if (changedApps.length > 0) {
        this.playChimesForApps(changedApps);
      }
    });
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.unlockAudio);
    this.audioCtx.close();
  }

  private playChimesForApps(appIds: string[]) {
    this.audioCtx.resume().then(() => {
      const ctx = this.audioCtx;
      const uniqueApps = [...new Set(appIds)].slice(0, 4);
      uniqueApps.forEach((appId, appIndex) => {
        const profile = this.getToneProfile(appId);
        profile.notes.forEach((freq, noteIndex) => {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = profile.type;
          osc.frequency.value = freq;
          const start = ctx.currentTime + (appIndex * 0.24) + (noteIndex * 0.08);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(profile.gain, start + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
          osc.start(start);
          osc.stop(start + 0.2);
        });
      });
    }).catch(() => {});
  }

  private getToneProfile(appId: string): { notes: number[]; type: OscillatorType; gain: number } {
    const normalized = appId.toLowerCase();
    const known = this.appToneProfiles[normalized];
    if (known) {
      return known;
    }

    const hash = Array.from(normalized).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const base = 320 + (hash % 120);
    return {
      notes: [base, base * 1.26, base * 1.5],
      type: 'triangle',
      gain: 0.12,
    };
  }

  private playChime() {
    this.audioCtx.resume().then(() => {
      const ctx = this.audioCtx;
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    }).catch(() => {});
  }

  isHighlighted(appId: string): boolean {
    const t = this.lastChangedAt.get(appId);
    return t !== undefined && Date.now() - t < this.HIGHLIGHT_MS;
  }

  badgeCount(appId: string): number {
    const clearsAt = this.badgeClearsAt.get(appId);
    if (!clearsAt || Date.now() >= clearsAt) {
      this.newEventCount.delete(appId);
      this.badgeClearsAt.delete(appId);
      return 0;
    }
    return this.newEventCount.get(appId) ?? 0;
  }
  readonly pvTennisClubName = 'Punta Verde Tennis Club';
  readonly sheServesTCId = 'sheservestc';
  readonly sheServesTCName = 'SheServes Tennis Club';
  readonly rt2TennisClubId = 'rt2tennisclub';
  readonly rt2TennisClubName = 'RT2 Tennis Club';
  readonly rcTennisAcademyId = 'rctennisacademy';
  readonly rcTennisAcademyName = 'RC Tennis Academy';
  readonly tennisMarketplaceId = 'tennismarketplace';
  readonly tennisMarketplaceName = 'Tennis Marketplace';
  readonly tenisuAppId = 'tenisuapp';
  readonly tenisuAppName = 'Tenisu Tennis Club';

  private readonly KNOWN_APP_IDS = [
    'pvtennisclub',
    'sheservestc',
    'rt2tennisclub',
    'rctennisacademy',
    'tennismarketplace',
    'tenisuapp',
  ];

  private raw$ = combineLatest([this.analytics.visits$, this.analytics.logins$]).pipe(
    map(([visits, logins]) => {
      const latestVisitByApp = this.getLatestTimestampByApp(visits.rows);
      const latestLoginByApp = this.getLatestTimestampByApp(logins.rows);

      const allApps = this.KNOWN_APP_IDS;

      return allApps.map(appId => {
        const latestVisitAt = latestVisitByApp.get(appId) ?? null;
        const latestLoginAt = latestLoginByApp.get(appId) ?? null;
        const latestActivityAt = this.getLatestTimestamp(latestVisitAt, latestLoginAt);

        return {
          appId,
          visits: visits.summary.find(s => s._id === appId)?.count ?? 0,
          logins: logins.summary.find(s => s._id === appId)?.count ?? 0,
          latestActivityAt,
          latestActivityType:
            latestActivityAt === null
              ? null
              : latestActivityAt === latestVisitAt
                ? 'Visit'
                : 'Login',
        };
      }).sort((a, b) => {
        if (!a.latestActivityAt && !b.latestActivityAt) return 0;
        if (!a.latestActivityAt) return 1;
        if (!b.latestActivityAt) return -1;
        return Date.parse(b.latestActivityAt) - Date.parse(a.latestActivityAt);
      });
    })
  );

  apps = toSignal(this.raw$, { initialValue: [] });

  summary = computed(() => {
    const apps = this.apps();
    const totalVisits = apps.reduce((sum, app) => sum + app.visits, 0);
    const totalLogins = apps.reduce((sum, app) => sum + app.logins, 0);
    const activeApps = apps.filter(app => app.visits > 0 || app.logins > 0).length;
    const topApp = [...apps].sort(
      (left, right) => right.visits + right.logins - (left.visits + left.logins)
    )[0];

    return {
      appCount: apps.length,
      activeApps,
      totalVisits,
      totalLogins,
      topApp: topApp?.appId ?? 'No data yet',
    };
  });

  refresh(): void {
    this.analytics.refresh();
    this.lastRefreshed.set(new Date());
  }

  isPvTennisClub(appId: string): boolean {
    return appId.toLowerCase() === this.pvTennisClubId;
  }

  isSheServesTC(appId: string): boolean {
    return appId.toLowerCase() === this.sheServesTCId;
  }

  isRT2TennisClub(appId: string): boolean {
    return appId.toLowerCase() === this.rt2TennisClubId;
  }

  isRCTennisAcademy(appId: string): boolean {
    return appId.toLowerCase() === this.rcTennisAcademyId;
  }

  isTennisMarketplace(appId: string): boolean {
    return appId.toLowerCase() === this.tennisMarketplaceId;
  }

  isTenisuApp(appId: string): boolean {
    return appId.toLowerCase() === this.tenisuAppId;
  }

  displayAppName(appId: string): string {
    if (appId === 'No data yet') {
      return appId;
    }
    if (this.isPvTennisClub(appId)) return this.pvTennisClubName;
    if (this.isSheServesTC(appId)) return this.sheServesTCName;
    if (this.isRT2TennisClub(appId)) return this.rt2TennisClubName;
    if (this.isRCTennisAcademy(appId)) return this.rcTennisAcademyName;
    if (this.isTennisMarketplace(appId)) return this.tennisMarketplaceName;
    if (this.isTenisuApp(appId)) return this.tenisuAppName;
    return appId;
  }

  appSiteUrl(appId: string): string | null {
    const normalized = appId.toLowerCase();
    const urls: Record<string, string> = {
      pvtennisclub: 'https://pvtennisclub.netlify.app/',
      sheservestc: 'https://she-serves-tc.netlify.app/',
      rt2tennisclub: 'https://tennisclubrt2-v2.netlify.app/',
      rctennisacademy: 'https://rctennis-academy.netlify.app/',
      tennismarketplace: 'https://tennis-marketplace.netlify.app/',
      tenisuapp: 'https://tenisu-app.netlify.app/player/',
    };

    return urls[normalized] ?? null;
  }

  private getLatestTimestampByApp(rows: Array<VisitRow | LoginRow>): Map<string, string> {
    const latestByApp = new Map<string, string>();

    for (const row of rows) {
      const appId = row.appId;
      const current = latestByApp.get(appId);
      const next = row.timestamp;
      latestByApp.set(appId, this.getLatestTimestamp(current ?? null, next) ?? next);
    }

    return latestByApp;
  }

  private getLatestTimestamp(left: string | null, right: string | null): string | null {
    if (!left) {
      return right;
    }
    if (!right) {
      return left;
    }

    return Date.parse(left) >= Date.parse(right) ? left : right;
  }
}
