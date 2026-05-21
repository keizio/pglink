import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionProvider as SubscriptionProviderEnum,
  BillingCycle,
} from './entities/subscription.entity';
import {
  CreateSubscriptionDto,
  SubscriptionCallbackDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto';
import { XenditSubscriptionProvider } from './providers/xendit-subscription.provider';
import { MidtransSubscriptionProvider } from './providers/midtrans-subscription.provider';
import {
  SubscriptionProvider,
  SubscriptionResponse,
} from './providers/subscription-provider.interface';
import { Application } from '../applications/entities/application.entity';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly xenditSubscriptionProvider: XenditSubscriptionProvider,
    private readonly midtransSubscriptionProvider: MidtransSubscriptionProvider,
  ) {}

  private getProvider(
    provider: SubscriptionProviderEnum,
  ): SubscriptionProvider {
    switch (provider) {
      case SubscriptionProviderEnum.XENDIT:
        return this.xenditSubscriptionProvider;
      case SubscriptionProviderEnum.MIDTRANS:
        return this.midtransSubscriptionProvider;
      default:
        throw new HttpException(
          {
            status: 'error',
            message: 'Unsupported subscription provider',
            code: 'UNSUPPORTED_PROVIDER',
          },
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  async createSubscription(
    application: Application,
    dto: CreateSubscriptionDto,
  ): Promise<{ data: Subscription; checkoutUrl?: string }> {
    const provider = this.getProvider(dto.provider);
    const subscriptionResponse: SubscriptionResponse =
      await provider.createSubscription(application.id, dto);

    let paymentMethod: string | undefined;
    if (dto.metadata?.pm_id) {
      paymentMethod = 'CARD';
    } else if (dto.metadata?.saved_token_id) {
      paymentMethod = 'CREDIT_CARD';
    }

    const subscription = this.subscriptionRepository.create({
      applicationId: application.id,
      applicationSubscriptionId: dto.applicationSubscriptionId,
      externalSubscriptionId: subscriptionResponse.externalSubscriptionId,
      amount: dto.amount,
      currency: dto.currency || 'IDR',
      status: SubscriptionStatus.ACTIVE,
      provider: dto.provider,
      paymentMethod,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      description: dto.description,
      billingCycle: dto.billingCycle || BillingCycle.MONTHLY,
      intervalCount: dto.intervalCount || 1,
      startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      nextBillingDate: this.calculateNextBillingDate(
        dto.billingCycle || BillingCycle.MONTHLY,
        dto.intervalCount || 1,
      ),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      checkoutUrl: subscriptionResponse.checkoutUrl,
      callbackUrl: subscriptionResponse.callbackUrl,
      metadata: dto.metadata,
    });

    const saved = await this.subscriptionRepository.save(subscription);
    this.logger.log(
      `Subscription created: ${saved.id} for application: ${application.id}`,
    );

    return { data: saved, checkoutUrl: subscriptionResponse.checkoutUrl };
  }

  async findByApplication(applicationId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({ where: { id } });
  }

  async findByExternalId(
    externalSubscriptionId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { externalSubscriptionId },
    });
  }

  async findByExternalIdWithApplication(
    externalSubscriptionId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { externalSubscriptionId },
      relations: ['application'],
    });
  }

  async updateSubscription(
    id: string,
    dto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.findById(id);
    if (!subscription) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.amount !== undefined) {
      subscription.amount = dto.amount;
    }
    if (dto.currency !== undefined) {
      subscription.currency = dto.currency;
    }
    if (dto.billingCycle !== undefined) {
      subscription.billingCycle = dto.billingCycle;
    }
    if (dto.intervalCount !== undefined) {
      subscription.intervalCount = dto.intervalCount;
    }
    if (dto.endDate !== undefined) {
      subscription.endDate = new Date(dto.endDate);
    }
    if (dto.metadata !== undefined) {
      subscription.metadata = dto.metadata;
    }

    subscription.updatedAt = new Date();

    return this.subscriptionRepository.save(subscription);
  }

  async pauseSubscription(id: string): Promise<Subscription> {
    const subscription = await this.findById(id);
    if (!subscription) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const provider = this.getProvider(subscription.provider);
    await provider.pauseSubscription(subscription.externalSubscriptionId);

    subscription.status = SubscriptionStatus.PAUSED;
    subscription.updatedAt = new Date();

    return this.subscriptionRepository.save(subscription);
  }

  async resumeSubscription(id: string): Promise<Subscription> {
    const subscription = await this.findById(id);
    if (!subscription) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const provider = this.getProvider(subscription.provider);
    await provider.resumeSubscription(subscription.externalSubscriptionId);

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.updatedAt = new Date();

    return this.subscriptionRepository.save(subscription);
  }

  async cancelSubscription(id: string): Promise<Subscription> {
    const subscription = await this.findById(id);
    if (!subscription) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const provider = this.getProvider(subscription.provider);
    await provider.cancelSubscription(subscription.externalSubscriptionId);

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    subscription.updatedAt = new Date();

    return this.subscriptionRepository.save(subscription);
  }

  async handleCallback(
    provider: SubscriptionProviderEnum,
    payload: SubscriptionCallbackDto,
    callbackToken?: string,
  ): Promise<Subscription> {
    const providerImpl = this.getProvider(provider);

    if (!providerImpl.verifyCallbackToken(callbackToken)) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Invalid callback token',
          code: 'INVALID_CALLBACK_TOKEN',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const callbackResult = await providerImpl.handleCallback(payload);

    const subscription = await this.findByExternalIdWithApplication(
      callbackResult.externalSubscriptionId,
    );
    if (!subscription) {
      this.logger.warn(
        `Subscription not found for external ID: ${callbackResult.externalSubscriptionId}`,
      );
      throw new HttpException(
        {
          status: 'error',
          message: 'Subscription not found',
          code: 'SUBSCRIPTION_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const statusMap: Record<string, SubscriptionStatus> = {
      ACTIVE: SubscriptionStatus.ACTIVE,
      active: SubscriptionStatus.ACTIVE,
      INACTIVE: SubscriptionStatus.PAUSED,
      inactive: SubscriptionStatus.PAUSED,
      PENDING: SubscriptionStatus.ACTIVE,
      pending: SubscriptionStatus.ACTIVE,
      PAUSED: SubscriptionStatus.PAUSED,
      paused: SubscriptionStatus.PAUSED,
      CANCELLED: SubscriptionStatus.CANCELLED,
      cancelled: SubscriptionStatus.CANCELLED,
      EXPIRED: SubscriptionStatus.EXPIRED,
      expired: SubscriptionStatus.EXPIRED,
      FAILED: SubscriptionStatus.FAILED,
      failed: SubscriptionStatus.FAILED,
    };

    subscription.status =
      statusMap[callbackResult.status] || subscription.status;

    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.PAUSED
    ) {
      this.logger.log(
        `Subscription ${subscription.id} callback already processed with status: ${subscription.status}, skipping`,
      );
      return subscription;
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      subscription.nextBillingDate = this.calculateNextBillingDate(
        subscription.billingCycle,
        subscription.intervalCount,
      );
    }

    subscription.updatedAt = new Date();

    const updated = await this.subscriptionRepository.save(subscription);
    this.logger.log(
      `Subscription ${subscription.id} status updated to: ${subscription.status}`,
    );

    await this.forwardCallbackToApplication(subscription);

    return updated;
  }

  private async forwardCallbackToApplication(
    subscription: Subscription,
  ): Promise<void> {
    const application = subscription.application;
    if (!application?.subscriptionWebhookUrl) {
      this.logger.warn(
        `No subscription webhook URL configured for application: ${subscription.applicationId}`,
      );
      return;
    }

    try {
      const callbackPayload = {
        subscriptionId: subscription.id,
        applicationSubscriptionId: subscription.applicationSubscriptionId,
        externalSubscriptionId: subscription.externalSubscriptionId,
        amount: subscription.amount,
        currency: subscription.currency,
        status: subscription.status,
        provider: subscription.provider,
        paymentMethod: subscription.paymentMethod,
        customerEmail: subscription.customerEmail,
        description: subscription.description,
        billingCycle: subscription.billingCycle,
        nextBillingDate: subscription.nextBillingDate,
        metadata: subscription.metadata,
      };

      await axios.post(application.subscriptionWebhookUrl, callbackPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': application.apiKey,
          'X-Subscription-Id': subscription.id,
        },
        timeout: 10000,
      });

      this.logger.log(
        `Callback forwarded to webhook for subscription: ${subscription.id}`,
      );
    } catch (error) {
      this.logger.error(`Failed to forward callback to webhook: ${error}`);
    }
  }

  private calculateNextBillingDate(
    billingCycle: BillingCycle,
    intervalCount: number,
  ): Date {
    const now = new Date();
    const nextDate = new Date(now);

    switch (billingCycle) {
      case BillingCycle.DAILY:
        nextDate.setDate(nextDate.getDate() + intervalCount);
        break;
      case BillingCycle.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7 * intervalCount);
        break;
      case BillingCycle.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + intervalCount);
        break;
      case BillingCycle.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + intervalCount);
        break;
    }

    return nextDate;
  }
}
