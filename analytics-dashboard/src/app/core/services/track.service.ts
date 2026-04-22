import { Injectable } from '@angular/core';
import { TrackingPayload, EventType } from '../../shared/models/event.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TrackService {
  private readonly endpoint = `${environment.apiBase}/track`;

  trackEvent(payload: Omit<TrackingPayload, 'timestamp'>): void {
    const body: TrackingPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    try {
      const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      const sent = navigator.sendBeacon(this.endpoint, blob);
      if (!sent) {
        console.warn('[TrackService] sendBeacon queue full, event discarded');
      }
    } catch {
      // Tracking must never interrupt the user
    }
  }

  trackPageView(appId: string, page: string, userId?: string): void {
    this.trackEvent({ event: 'page_view', appId, page, userId });
  }

  trackLogin(appId: string, userId: string): void {
    this.trackEvent({ event: 'login', appId, userId });
  }
}
