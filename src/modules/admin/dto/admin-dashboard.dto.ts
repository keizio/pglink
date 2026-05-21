export interface DashboardSummary {
  applications: ApplicationSummary;
  payments: PaymentSummary;
  subscriptions: SubscriptionSummary;
  transactions: TransactionSummary;
  recentActivity: RecentActivity[];
}

export interface ApplicationSummary {
  total: number;
  active: number;
  inactive: number;
}

export interface PaymentSummary {
  total: number;
  pending: number;
  success: number;
  failed: number;
  expired: number;
  totalAmount: number;
  successAmount: number;
}

export interface SubscriptionSummary {
  total: number;
  active: number;
  paused: number;
  cancelled: number;
  expired: number;
  failed: number;
  totalAmount: number;
  activeAmount: number;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalVolume: number;
  successRate: number;
  dailyTrend: DailyTrend[];
}

export interface DailyTrend {
  date: string;
  payments: number;
  subscriptions: number;
  amount: number;
}

export interface RecentActivity {
  id: string;
  type: 'payment' | 'subscription' | 'application';
  action: string;
  description: string;
  amount?: number;
  status?: string;
  createdAt: Date;
}
