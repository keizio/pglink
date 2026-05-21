import {
  CreateSubscriptionDto,
  SubscriptionCallbackDto,
} from '../dto/subscription.dto';

export interface SubscriptionResponse {
  externalSubscriptionId: string;
  checkoutUrl?: string;
  callbackUrl?: string;
  status: string;
}

export interface SubscriptionCallbackResult {
  externalSubscriptionId: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface SubscriptionProvider {
  createSubscription(
    applicationId: string,
    dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponse>;

  handleCallback(
    payload: SubscriptionCallbackDto,
  ): Promise<SubscriptionCallbackResult>;

  pauseSubscription(
    externalSubscriptionId: string,
  ): Promise<SubscriptionResponse>;

  resumeSubscription(
    externalSubscriptionId: string,
  ): Promise<SubscriptionResponse>;

  cancelSubscription(
    externalSubscriptionId: string,
  ): Promise<SubscriptionResponse>;

  verifySignature(payload: string, signature: string): boolean;

  verifyCallbackToken(token: string | undefined): boolean;
}
