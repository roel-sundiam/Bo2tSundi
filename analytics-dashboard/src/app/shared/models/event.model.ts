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
  userId?: string | null;
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

export interface RegistrationsResponse {
  columns: string[];
  rows: Record<string, string>[];
}

export interface ReservationRT2Row {
  bookedBy: string;
  date: string;
  timeSlot: number;
  endTimeSlot: number;
  players: string[];
  status: string;
  paymentStatus: string;
  totalFee: number;
}

export interface ReservationsRT2Response {
  rows: ReservationRT2Row[];
}

export interface PaymentRT2Row {
  paidBy: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  description: string;
  status: string;
  paymentDate: string;
  referenceNumber: string;
}

export interface PaymentsRT2Response {
  rows: PaymentRT2Row[];
}

export interface SheServesFinanceEntry {
  _id: string;
  entryType: 'cash-in' | 'cash-out';
  amount: number;
  description: string;
  date: string;
  createdBy: string;
}

export interface SheServesServicePayment {
  _id: string;
  amount: number;
  date: string;
  paidBy: string;
  note: string;
}

export interface SheServesFinanceSummary {
  collections: number;
  disbursements: number;
  netIncome: number;
  appServiceFee: number;
  totalServicePaid: number;
  outstandingFee: number;
}
