import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
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

interface MidtransSubscriptionResponse {
  id: string;
  name: string;
  status: string;
  redirect_url?: string;
  token?: string;
  status_message?: string;
}

@Injectable()
export class MidtransSubscriptionProvider implements SubscriptionProvider {
  private readonly logger = new Logger(MidtransSubscriptionProvider.name);
  private readonly client: AxiosInstance;
  private readonly serverKey: string;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.serverKey =
      this.configService.get<string>('MIDTRANS_SERVER_KEY') || '';
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    const baseUrl = this.isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Basic ${Buffer.from(this.serverKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  private logAxiosError(error: unknown, context: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Midtrans subscription ${context} failed - URL: ${axiosError.config?.url || 'unknown'}, ` +
          `Method: ${axiosError.config?.method?.toUpperCase() || 'unknown'}, ` +
          `Status: ${axiosError.response?.status || 'no response'}, ` +
          `Response: ${JSON.stringify(axiosError.response?.data) || 'no data'}, ` +
          `Message: ${axiosError.message}`,
        axiosError.stack,
      );
    } else {
      this.logger.error(
        `Midtrans subscription ${context} failed: ${String(error)}`,
      );
    }
  }

  async createSubscription(
    applicationId: string,
    dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponse> {
    try {
      const externalSubscriptionId = `sub-${applicationId}-${randomUUID().slice(0, 8)}`;

      const token = dto.metadata?.saved_token_id;

      if (typeof token !== 'string' || !token) {
        throw new HttpException(
          {
            status: 'error',
            message: 'Midtrans subscription requires metadata.saved_token_id',
            code: 'MIDTRANS_SUBSCRIPTION_TOKEN_REQUIRED',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const interval = dto.intervalCount || 1;
      const intervalUnit = this.mapBillingCycle(
        dto.billingCycle || BillingCycle.MONTHLY,
      );

      const payload: Record<string, unknown> = {
        name: externalSubscriptionId,
        amount: String(dto.amount),
        currency: dto.currency || 'IDR',
        token,
        schedule: {
          interval,
          interval_unit: intervalUnit,
          ...(dto.endDate ? { max_interval: interval } : {}),
          ...(dto.startDate
            ? {
                start_time: this.formatMidtransDateTime(dto.startDate),
              }
            : {}),
        },
        metadata: {
          ...(dto.metadata || {}),
          payment_type: 'credit_card',
        },
      };

      const response = await this.client.post<MidtransSubscriptionResponse>(
        '/v1/subscriptions',
        payload,
      );
      const data = response.data;

      return {
        externalSubscriptionId: data.id,
        checkoutUrl: data.redirect_url,
        status: data.status,
      };
    } catch (error) {
      this.logAxiosError(error, 'creation');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to create Midtrans subscription',
          code: 'MIDTRANS_SUBSCRIPTION_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  handleCallback(
    payload: SubscriptionCallbackDto,
  ): Promise<SubscriptionCallbackResult> {
    const callbackBody = payload as unknown as {
      order_id: string;
      status_code: string;
      gross_amount: string;
      signature_key: string;
      transaction_status: string;
    };

    if (callbackBody.signature_key) {
      const isValid = this.verifySignature(
        callbackBody.order_id +
          callbackBody.status_code +
          callbackBody.gross_amount +
          this.serverKey,
        callbackBody.signature_key,
      );

      if (!isValid) {
        this.logger.warn('Invalid Midtrans signature');
      }
    }

    return Promise.resolve({
      externalSubscriptionId:
        payload.subscription_id || payload.external_id || '',
      status: payload.transaction_status || payload.status || '',
      metadata: payload.metadata,
    });
  }

  async pauseSubscription(
    externalSubscriptionId: string,
  ): Promise<SubscriptionResponse> {
    try {
      const response = await this.client.post<MidtransSubscriptionResponse>(
        `/v1/subscriptions/${externalSubscriptionId}/disable`,
      );
      const data = response.data;

      return {
        externalSubscriptionId: data.id || externalSubscriptionId,
        status: data.status || 'INACTIVE',
      };
    } catch (error) {
      this.logAxiosError(error, 'pause');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to pause Midtrans subscription',
          code: 'MIDTRANS_SUBSCRIPTION_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async resumeSubscription(
    externalSubscriptionId: string,
  ): Promise<SubscriptionResponse> {
    try {
      const response = await this.client.post<MidtransSubscriptionResponse>(
        `/v1/subscriptions/${externalSubscriptionId}/enable`,
      );
      const data = response.data;

      return {
        externalSubscriptionId: data.id || externalSubscriptionId,
        status: data.status || 'ACTIVE',
      };
    } catch (error) {
      this.logAxiosError(error, 'resume');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to resume Midtrans subscription',
          code: 'MIDTRANS_SUBSCRIPTION_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async cancelSubscription(
    externalSubscriptionId: string,
  ): Promise<SubscriptionResponse> {
    try {
      const response = await this.client.delete<MidtransSubscriptionResponse>(
        `/v1/subscriptions/${externalSubscriptionId}`,
      );
      const data = response.data;

      return {
        externalSubscriptionId: data.id,
        status: 'CANCELLED',
      };
    } catch (error) {
      this.logAxiosError(error, 'cancel');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to cancel Midtrans subscription',
          code: 'MIDTRANS_SUBSCRIPTION_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  verifySignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHash('sha256')
      .update(payload)
      .digest('hex');
    return expectedSignature === signature;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verifyCallbackToken(_token: string | undefined): boolean {
    return true;
  }

  private mapBillingCycle(billingCycle: BillingCycle): string {
    switch (billingCycle) {
      case BillingCycle.DAILY:
        return 'day';
      case BillingCycle.WEEKLY:
        return 'week';
      case BillingCycle.MONTHLY:
        return 'month';
      case BillingCycle.YEARLY:
        return 'month';
      default:
        return 'month';
    }
  }

  private formatMidtransDateTime(date: string): string {
    const isoDate = new Date(date).toISOString();
    return `${isoDate.slice(0, 19).replace('T', ' ')} +0000`;
  }
}
