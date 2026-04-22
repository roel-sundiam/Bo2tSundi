import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Observable, Subject, interval, switchMap,
  shareReplay, takeUntil, startWith, catchError, of,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { VisitsResponse, LoginsResponse } from '../../shared/models/event.model';

const POLL_INTERVAL_MS = 7000;

@Injectable({ providedIn: 'root' })
export class AnalyticsService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly destroy$ = new Subject<void>();
  private readonly base = environment.apiBase;

  readonly visits$: Observable<VisitsResponse> = interval(POLL_INTERVAL_MS).pipe(
    startWith(0),
    switchMap(() =>
      this.http.get<VisitsResponse>(`${this.base}/getVisits`, {
        params: new HttpParams().set('today', 'true').set('limit', '200'),
      }).pipe(catchError(() => of({ rows: [], summary: [], total: 0 })))
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
    takeUntil(this.destroy$),
  );

  readonly logins$: Observable<LoginsResponse> = interval(POLL_INTERVAL_MS).pipe(
    startWith(0),
    switchMap(() =>
      this.http.get<LoginsResponse>(`${this.base}/getLogins`, {
        params: new HttpParams().set('today', 'true').set('limit', '200'),
      }).pipe(catchError(() => of({ rows: [], summary: [], total: 0 })))
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
    takeUntil(this.destroy$),
  );

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
