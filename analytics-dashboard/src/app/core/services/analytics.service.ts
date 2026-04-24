import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Observable, Subject, BehaviorSubject, switchMap,
  shareReplay, takeUntil, catchError, of, combineLatest, map, tap,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { VisitsResponse, LoginsResponse, RegistrationsResponse, ReservationsRT2Response, PaymentsRT2Response, SheServesFinanceEntry, SheServesServicePayment, SheServesFinanceSummary } from '../../shared/models/event.model';

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AnalyticsService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly destroy$ = new Subject<void>();
  private readonly base = environment.apiBase;

  private readonly refreshTrigger$ = new BehaviorSubject<void>(undefined);
  private readonly cache = new Map<string, { data: unknown; cachedAt: number }>();

  private getLocalMidnightMs(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return String(d.getTime());
  }

  private cachedGet<T>(key: string, url: string, params: HttpParams): Observable<T> {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.cachedAt < CACHE_TTL_MS) {
      return of(entry.data as T);
    }
    return this.http.get<T>(url, { params }).pipe(
      tap(data => this.cache.set(key, { data, cachedAt: Date.now() }))
    );
  }

  refresh(): void {
    this.cache.clear();
    this.refreshTrigger$.next();
  }

  private readonly visitsBoD$: Observable<VisitsResponse> = this.refreshTrigger$.pipe(
    switchMap(() =>
      this.cachedGet<VisitsResponse>(
        `getVisits-${this.getLocalMidnightMs()}`,
        `${this.base}/getVisits`,
        new HttpParams().set('since', this.getLocalMidnightMs()).set('limit', '200'),
      ).pipe(catchError(() => of({ rows: [], summary: [], total: 0 })))
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
    takeUntil(this.destroy$),
  );

  private readonly visitsRT2$: Observable<VisitsResponse> = this.refreshTrigger$.pipe(
    switchMap(() =>
      this.cachedGet<VisitsResponse>(
        `getVisitsRT2-${this.getLocalMidnightMs()}`,
        `${this.base}/getVisitsRT2`,
        new HttpParams().set('since', this.getLocalMidnightMs()).set('limit', '200'),
      ).pipe(catchError(() => of({ rows: [], summary: [], total: 0 })))
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
    takeUntil(this.destroy$),
  );

  private readonly visitsRC$: Observable<VisitsResponse> = this.refreshTrigger$.pipe(
    switchMap(() =>
      this.cachedGet<VisitsResponse>(
        `getVisitsRC-${this.getLocalMidnightMs()}`,
        `${this.base}/getVisitsRC`,
        new HttpParams().set('since', this.getLocalMidnightMs()).set('limit', '200'),
      ).pipe(catchError(() => of({ rows: [], summary: [], total: 0 })))
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
    takeUntil(this.destroy$),
  );

  private readonly visitsMarketplace$: Observable<VisitsResponse> = this.refreshTrigger$.pipe(
    switchMap(() =>
      this.cachedGet<VisitsResponse>(
        `getVisitsMarketplace-${this.getLocalMidnightMs()}`,
        `${this.base}/getVisitsMarketplace`,
        new HttpParams().set('since', this.getLocalMidnightMs()).set('limit', '200'),
      ).pipe(catchError(() => of({ rows: [], summary: [], total: 0 })))
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
    takeUntil(this.destroy$),
  );

  readonly visits$: Observable<VisitsResponse> = combineLatest([
    this.visitsBoD$,
    this.visitsRT2$,
    this.visitsRC$,
    this.visitsMarketplace$,
  ]).pipe(
    map(([a, b, c, d]) => ({
      rows: [...a.rows, ...b.rows, ...c.rows, ...d.rows],
      summary: [...a.summary, ...b.summary, ...c.summary, ...d.summary],
      total: a.total + b.total + c.total + d.total,
    })),
    shareReplay({ bufferSize: 1, refCount: false }),
    takeUntil(this.destroy$),
  );

  private readonly loginsBoD$: Observable<LoginsResponse> = this.refreshTrigger$.pipe(
    switchMap(() =>
      this.cachedGet<LoginsResponse>(
        `getLogins-${this.getLocalMidnightMs()}`,
        `${this.base}/getLogins`,
        new HttpParams().set('since', this.getLocalMidnightMs()).set('limit', '200'),
      ).pipe(catchError(() => of({ rows: [], summary: [], total: 0 })))
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
    takeUntil(this.destroy$),
  );

  private readonly loginsRT2$: Observable<LoginsResponse> = this.refreshTrigger$.pipe(
    switchMap(() =>
      this.cachedGet<LoginsResponse>(
        `getLoginsRT2-${this.getLocalMidnightMs()}`,
        `${this.base}/getLoginsRT2`,
        new HttpParams().set('since', this.getLocalMidnightMs()).set('limit', '200'),
      ).pipe(catchError(() => of({ rows: [], summary: [], total: 0 })))
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
    takeUntil(this.destroy$),
  );

  private readonly loginsRC$: Observable<LoginsResponse> = this.refreshTrigger$.pipe(
    switchMap(() =>
      this.cachedGet<LoginsResponse>(
        `getLoginsRC-${this.getLocalMidnightMs()}`,
        `${this.base}/getLoginsRC`,
        new HttpParams().set('since', this.getLocalMidnightMs()).set('limit', '200'),
      ).pipe(catchError(() => of({ rows: [], summary: [], total: 0 })))
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
    takeUntil(this.destroy$),
  );

  private readonly loginsMarketplace$: Observable<LoginsResponse> = this.refreshTrigger$.pipe(
    switchMap(() =>
      this.cachedGet<LoginsResponse>(
        `getLoginsMarketplace-${this.getLocalMidnightMs()}`,
        `${this.base}/getLoginsMarketplace`,
        new HttpParams().set('since', this.getLocalMidnightMs()).set('limit', '200'),
      ).pipe(catchError(() => of({ rows: [], summary: [], total: 0 })))
    ),
    shareReplay({ bufferSize: 1, refCount: false }),
    takeUntil(this.destroy$),
  );

  readonly logins$: Observable<LoginsResponse> = combineLatest([
    this.loginsBoD$,
    this.loginsRT2$,
    this.loginsRC$,
    this.loginsMarketplace$,
  ]).pipe(
    map(([a, b, c, d]) => ({
      rows: [...a.rows, ...b.rows, ...c.rows, ...d.rows],
      summary: [...a.summary, ...b.summary, ...c.summary, ...d.summary],
      total: a.total + b.total + c.total + d.total,
    })),
    shareReplay({ bufferSize: 1, refCount: false }),
    takeUntil(this.destroy$),
  );

  getVisitsSince(sinceMs: string, limit = '250000'): Observable<VisitsResponse> {
    return combineLatest([
      this.http
        .get<VisitsResponse>(`${this.base}/getVisits`, {
          params: new HttpParams().set('since', sinceMs).set('limit', limit),
        })
        .pipe(catchError(() => of({ rows: [], summary: [], total: 0 }))),
      this.http
        .get<VisitsResponse>(`${this.base}/getVisitsRT2`, {
          params: new HttpParams().set('since', sinceMs).set('limit', limit),
        })
        .pipe(catchError(() => of({ rows: [], summary: [], total: 0 }))),
      this.http
        .get<VisitsResponse>(`${this.base}/getVisitsRC`, {
          params: new HttpParams().set('since', sinceMs).set('limit', limit),
        })
        .pipe(catchError(() => of({ rows: [], summary: [], total: 0 }))),
      this.http
        .get<VisitsResponse>(`${this.base}/getVisitsMarketplace`, {
          params: new HttpParams().set('since', sinceMs).set('limit', limit),
        })
        .pipe(catchError(() => of({ rows: [], summary: [], total: 0 }))),
    ]).pipe(
      map(([a, b, c, d]) => ({
        rows: [...a.rows, ...b.rows, ...c.rows, ...d.rows],
        summary: [...a.summary, ...b.summary, ...c.summary, ...d.summary],
        total: a.total + b.total + c.total + d.total,
      }))
    );
  }

  getLoginsSince(sinceMs: string, limit = '250000'): Observable<LoginsResponse> {
    return combineLatest([
      this.http
        .get<LoginsResponse>(`${this.base}/getLogins`, {
          params: new HttpParams().set('since', sinceMs).set('limit', limit),
        })
        .pipe(catchError(() => of({ rows: [], summary: [], total: 0 }))),
      this.http
        .get<LoginsResponse>(`${this.base}/getLoginsRT2`, {
          params: new HttpParams().set('since', sinceMs).set('limit', limit),
        })
        .pipe(catchError(() => of({ rows: [], summary: [], total: 0 }))),
      this.http
        .get<LoginsResponse>(`${this.base}/getLoginsRC`, {
          params: new HttpParams().set('since', sinceMs).set('limit', limit),
        })
        .pipe(catchError(() => of({ rows: [], summary: [], total: 0 }))),
      this.http
        .get<LoginsResponse>(`${this.base}/getLoginsMarketplace`, {
          params: new HttpParams().set('since', sinceMs).set('limit', limit),
        })
        .pipe(catchError(() => of({ rows: [], summary: [], total: 0 }))),
    ]).pipe(
      map(([a, b, c, d]) => ({
        rows: [...a.rows, ...b.rows, ...c.rows, ...d.rows],
        summary: [...a.summary, ...b.summary, ...c.summary, ...d.summary],
        total: a.total + b.total + c.total + d.total,
      }))
    );
  }

  getNetlifyUsage(): Observable<{ invocations: number; date: string }> {
    return this.http.get<{ invocations: number; date: string }>(`${this.base}/getNetlifyUsage`).pipe(
      catchError(() => of({ invocations: 0, date: '' }))
    );
  }

  getSheServesFinance(): Observable<SheServesFinanceSummary> {
    const base = 'https://she-serves-tc.netlify.app/.netlify/functions/api/api';
    return combineLatest([
      this.http.get<SheServesFinanceEntry[]>(`${base}/finances`).pipe(catchError(() => of([]))),
      this.http.get<SheServesServicePayment[]>(`${base}/service-payments`).pipe(catchError(() => of([]))),
    ]).pipe(
      map(([entries, payments]) => {
        const collections = entries.filter(e => e.entryType === 'cash-in').reduce((sum, e) => sum + e.amount, 0);
        const disbursements = entries.filter(e => e.entryType === 'cash-out').reduce((sum, e) => sum + e.amount, 0);
        const netIncome = collections - disbursements;
        const appServiceFee = netIncome > 0 ? netIncome * 0.05 : 0;
        const totalServicePaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const outstandingFee = Math.max(0, appServiceFee - totalServicePaid);
        return { collections, disbursements, netIncome, appServiceFee, totalServicePaid, outstandingFee };
      })
    );
  }

  getRegistrations(): Observable<RegistrationsResponse> {
    return this.http.get<RegistrationsResponse>(`${this.base}/getRegistrations`).pipe(
      catchError(() => of({ columns: [], rows: [] }))
    );
  }

  getReservationsRT2(): Observable<ReservationsRT2Response> {
    return this.http.get<ReservationsRT2Response>(`${this.base}/getReservationsRT2`).pipe(
      catchError(() => of({ rows: [] }))
    );
  }

  getPaymentsRT2(): Observable<PaymentsRT2Response> {
    return this.http.get<PaymentsRT2Response>(`${this.base}/getPaymentsRT2`).pipe(
      catchError(() => of({ rows: [] }))
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
