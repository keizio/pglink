import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import {
  SubscriptionProvider,
  SubscriptionResponse,
  SubscriptionCallbackResult,
} from './subscription-provider.interface';
import {
  CreateSubscriptionDto,
  SubscriptionCallbackDto,
} from '../dto/subscription.dto';
import { BillingCycle } from '../entities/subscription.entity';

interface XenditSubscriptionResponse {
  id: string;
  reference_id?: string;
  customer_id?: string;
  recurring_action?: string;
  currency?: string;
  amount?: number;
  schedule?: {
    reference_id?: string;
    interval?: string;
    interval_count?: number;
    total_recurrence?: number | null;
    anchor_date?: string;
  };
  actions?: Array<{
    url?: string;
    method?: string;
  }>;
  status: string;
}

@Injectable()
export class XenditSubscriptionProvider implements SubscriptionProvider {
  private readonly logger = new Logger(XenditSubscriptionProvider.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly webhookToken: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('XENDIT_API_KEY') || '';
    this.webhookToken =
      this.configService.get<string>('XENDIT_WEBHOOK_TOKEN') || '';
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    this.client = axios.create({
      baseURL: isProduction ? 'https://api.xendit.co' : 'https://api.xendit.co',
      headers: {
        Authorization: `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Api-Version': '2024-11-11',
      },
    });
  }

  private logAxiosError(error: unknown, context: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Xendit subscription ${context} failed - URL: ${axiosError.config?.url || 'unknown'}, ` +
          `Method: ${axiosError.config?.method?.toUpperCase() || 'unknown'}, ` +
          `Status: ${axiosError.response?.status || 'no response'}, ` +
          `Response: ${JSON.stringify(axiosError.response?.data) || 'no data'}, ` +
          `Message: ${axiosError.message}`,
        axiosError.stack,
      );
    } else {
      this.logger.error(
        `Xendit subscription ${context} failed: ${String(error)}`,
      );
    }
  }

  async createSubscription(
    applicationId: string,
    dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponse> {
    try {
      const externalSubscriptionId = `sub-${applicationId}-${randomUUID()}`;
      const interval = this.mapBillingCycle(
        dto.billingCycle || BillingCycle.MONTHLY,
      );
      const intervalCount = dto.intervalCount || 1;

      const paymentMethodId = dto.metadata?.pm_id;
      const customerId = dto.metadata?.customerId;

      if (typeof paymentMethodId !== 'string' || !paymentMethodId) {
        throw new HttpException(
          {
            status: 'error',
            message: 'Xendit subscription requires metadata.pm_id',
            code: 'XENDIT_SUBSCRIPTION_PAYMENT_METHOD_REQUIRED',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (typeof customerId !== 'string' || !customerId) {
        throw new HttpException(
          {
            status: 'error',
            message: 'Xendit subscription requires metadata.customerId',
            code: 'XENDIT_SUBSCRIPTION_CUSTOMER_REQUIRED',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const payload: Record<string, unknown> = {
        reference_id: externalSubscriptionId,
        customer_id: customerId,
        recurring_action: 'PAYMENT',
        amount: dto.amount,
        currency: dto.currency || 'IDR',
        schedule: {
          reference_id: `${externalSubscriptionId}-schedule`,
          interval,
          interval_count: intervalCount,
          total_recurrence: null,
          ...(dto.startDate
            ? { anchor_date: new Date(dto.startDate).toISOString() }
            : {}),
        },
        immediate_action_type: 'FULL_AMOUNT',
        payment_methods: [
          {
            payment_method_id: paymentMethodId,
            rank: 1,
          },
        ],
        metadata: dto.metadata || {},
      };

      const response = await this.client.post<XenditSubscriptionResponse>(
        '/recurring/plans',
        payload,
      );
      const data = response.data;
      const checkoutUrl = data.actions?.find((action) => action.url)?.url;

      return {
        externalSubscriptionId: data.id,
        checkoutUrl,
        status: data.status,
      };
    } catch (error) {
      this.logAxiosError(error, 'creation');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to create Xendit subscription',
          code: 'XENDIT_SUBSCRIPTION_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  handleCallback(
    payload: SubscriptionCallbackDto,
  ): Promise<SubscriptionCallbackResult> {
    const externalId =
      payload.id ||
      payload.subscription_id ||
      payload.reference_id ||
      payload.external_id ||
      '';

    let status = payload.status || '';
    if (payload.event) {
      const eventStatusMap: Record<string, string> = {
        'recurring.plan_activation': 'ACTIVE',
        'recurring.plan_inactivation': 'INACTIVE',
        'recurring.cycle.created': 'ACTIVE',
        'recurring.cycle.succeeded': 'ACTIVE',
        'recurring.cycle.retrying': 'PENDING',
        'recurring.cycle.failed': 'FAILED',
      };
      status = eventStatusMap[payload.event] || status;
    }

    return Promise.resolve({
      externalSubscriptionId: externalId,
      status,
      metadata: payload.metadata,
    });
  }

  async pauseSubscription(
    externalSubscriptionId: string,
  ): Promise<SubscriptionResponse> {
    try {
      const response = await this.client.post<XenditSubscriptionResponse>(
        `/recurring/plans/${externalSubscriptionId}/deactivate`,
      );
      const data = response.data;

      return {
        externalSubscriptionId: data.id || externalSubscriptionId,
        status: data.status,
      };
    } catch (error) {
      this.logAxiosError(error, 'pause');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to pause Xendit subscription',
          code: 'XENDIT_SUBSCRIPTION_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async resumeSubscription(
    externalSubscriptionId: string,
  ): Promise<SubscriptionResponse> {
    try {
      const response = await this.client.post<XenditSubscriptionResponse>(
        `/recurring/plans/${externalSubscriptionId}/reactivate`,
      );
      const data = response.data;

      return {
        externalSubscriptionId: data.id || externalSubscriptionId,
        status: data.status,
      };
    } catch (error) {
      this.logAxiosError(error, 'resume');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to resume Xendit subscription',
          code: 'XENDIT_SUBSCRIPTION_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async cancelSubscription(
    externalSubscriptionId: string,
  ): Promise<SubscriptionResponse> {
    try {
      const response = await this.client.post<XenditSubscriptionResponse>(
        `/recurring/plans/${externalSubscriptionId}/deactivate`,
      );
      const data = response.data;

      return {
        externalSubscriptionId: data.id || externalSubscriptionId,
        status: data.status,
      };
    } catch (error) {
      this.logAxiosError(error, 'cancel');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to cancel Xendit subscription',
          code: 'XENDIT_SUBSCRIPTION_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verifySignature(_payload: string, _signature: string): boolean {
    return true;
  }

  verifyCallbackToken(token: string | undefined): boolean {
    if (!token) {
      return false;
    }
    return token === this.webhookToken;
  }

  private mapBillingCycle(billingCycle: BillingCycle): string {
    switch (billingCycle) {
      case BillingCycle.DAILY:
        return 'DAY';
      case BillingCycle.WEEKLY:
        return 'WEEK';
      case BillingCycle.MONTHLY:
        return 'MONTH';
      case BillingCycle.YEARLY:
        return 'MONTH';
      default:
        return 'MONTH';
    }
  }
}
