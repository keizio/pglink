import { CreatePaymentDto, PaymentCallbackDto } from '../dto/payment.dto';
import { CreatePaymentLinkDto } from '../dto/payment-link.dto';
import {
  SavePaymentMethodDto,
  SavePaymentMethodResponseDto,
} from '../dto/save-payment-method.dto';

export interface PaymentLinkResponse {
  externalId: string;
  checkoutUrl: string;
  status: string;
}

export interface PaymentResponse {
  externalId: string;
  checkoutUrl?: string;
  callbackUrl?: string;
  status: string;
}

export interface CallbackResult {
  externalId: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentProvider {
  createPayment(
    applicationId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponse>;

  createPaymentLink(
    applicationId: string,
    dto: CreatePaymentLinkDto,
  ): Promise<PaymentLinkResponse>;

  savePaymentMethod(
    applicationId: string,
    dto: SavePaymentMethodDto,
  ): Promise<SavePaymentMethodResponseDto>;

  handleCallback(payload: PaymentCallbackDto): Promise<CallbackResult>;

  verifySignature(payload: string, signature: string): boolean;

  verifyCallbackToken(token: string | undefined): boolean;
}
