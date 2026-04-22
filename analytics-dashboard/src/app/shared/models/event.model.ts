export type EventType = 'page_view' | 'login';

export interface TrackingPayload {
  event: EventType;
  appId: string;
  userId?: string;
  page?: string;
  timestamp: string;
}

export interface VisitRow {
  appId: string;
  page: string;
  timestamp: string;
}

export interface LoginRow {
  appId: string;
  userId: string;
  timestamp: string;
}

export interface AppSummary {
  _id: string;
  count: number;
}

export interface VisitsResponse {
  rows: VisitRow[];
  summary: AppSummary[];
  total: number;
}

export interface LoginsResponse {
  rows: LoginRow[];
  summary: AppSummary[];
  total: number;
}
