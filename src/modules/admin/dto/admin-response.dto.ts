export class PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class PaymentData {
  id: string;
  applicationId: string;
  applicationOrderId: string;
  externalId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paymentMethod: string;
  customerEmail: string;
  description: string;
  createdAt: Date;
  processedAt: Date | null;
}

export class SubscriptionData {
  id: string;
  applicationId: string;
  applicationSubscriptionId: string;
  externalSubscriptionId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  paymentMethod: string;
  customerEmail: string;
  description: string;
  billingCycle: string;
  startDate: Date | null;
  nextBillingDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  cancelledAt: Date | null;
}
