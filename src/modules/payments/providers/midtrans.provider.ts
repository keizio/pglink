import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  PaymentResponse,
  CallbackResult,
  PaymentLinkResponse,
} from './payment-provider.interface';
import { CreatePaymentDto, PaymentCallbackDto } from '../dto/payment.dto';
import { CreatePaymentLinkDto } from '../dto/payment-link.dto';
import { MidtransPaymentMethod } from '../dto/midtrans-payment.dto';
import {
  SavePaymentMethodDto,
  SavePaymentMethodResponseDto,
} from '../dto/save-payment-method.dto';

interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

interface MidtransChargeResponse {
  va_numbers?: Array<{ va_number: string; bank: string }>;
  redirect_url?: string;
  transaction_status: string;
  qr_code_url?: string;
}

interface MidtransCallbackBody {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
}

interface MidtransCardRegisterResponse {
  saved_token_id?: string;
  status_code?: string;
}

@Injectable()
export class MidtransProvider implements PaymentProvider {
  private readonly logger = new Logger(MidtransProvider.name);
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
        `Midtrans ${context} failed - URL: ${axiosError.config?.url || 'unknown'}, ` +
          `Method: ${axiosError.config?.method?.toUpperCase() || 'unknown'}, ` +
          `Status: ${axiosError.response?.status || 'no response'}, ` +
          `Response: ${JSON.stringify(axiosError.response?.data) || 'no data'}, ` +
          `Message: ${axiosError.message}`,
        axiosError.stack,
      );
    } else {
      this.logger.error(`Midtrans ${context} failed: ${String(error)}`);
    }
  }

  async createPayment(
    _applicationId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponse> {
    try {
      const orderId = `payment-${_applicationId}-${randomUUID().slice(0, 8)}`;

      const paymentMethod =
        dto.midtransPaymentMethod || MidtransPaymentMethod.BANK_TRANSFER;

      const bankCode = dto.midtransBankCode;

      this.logger.log(
        `Creating Midtrans payment - applicationId: ${_applicationId}, amount: ${dto.amount}, method: ${paymentMethod}, bankCode: ${bankCode || 'N/A'}`,
      );

      const payload: Record<string, unknown> = {
        payment_type: paymentMethod,
        transaction_details: {
          order_id: orderId,
          gross_amount: dto.amount,
        },
      };

      if (dto.customerEmail || dto.customerPhone) {
        payload.customer_details = {
          email: dto.customerEmail,
          phone: dto.customerPhone,
        };
      }

      if (paymentMethod === MidtransPaymentMethod.BANK_TRANSFER && bankCode) {
        payload.bank_transfer = {
          bank: bankCode,
        };
      } else if (paymentMethod === MidtransPaymentMethod.CREDIT_CARD) {
        payload.credit_card = {
          token_id: (dto.metadata?.token_id as string) || '',
        };
      }

      this.logger.debug(
        `Midtrans createPayment payload: ${JSON.stringify(payload)}`,
      );

      const response = await this.client.post<MidtransChargeResponse>(
        '/v2/charge',
        payload,
      );
      const data: MidtransChargeResponse = response.data;

      this.logger.log(
        `Midtrans payment created - orderId: ${orderId}, status: ${data.transaction_status}, vaNumbers: ${data.va_numbers?.length || 0}`,
      );

      let checkoutUrl: string | undefined;
      if (data.redirect_url) {
        checkoutUrl = data.redirect_url;
      } else if (data.va_numbers && data.va_numbers.length > 0) {
        checkoutUrl = undefined;
      } else if (data.qr_code_url) {
        checkoutUrl = data.qr_code_url;
      }

      return {
        externalId: orderId,
        checkoutUrl,
        callbackUrl: undefined,
        status: data.transaction_status,
      };
    } catch (error) {
      this.logAxiosError(error, 'payment creation');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to create Midtrans payment',
          code: 'MIDTRANS_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async createPaymentLink(
    _applicationId: string,
    dto: CreatePaymentLinkDto,
  ): Promise<PaymentLinkResponse> {
    try {
      const orderId = `payment-link-${_applicationId}-${randomUUID().slice(0, 8)}`;

      this.logger.log(
        `Creating Midtrans payment link - applicationId: ${_applicationId}, amount: ${dto.amount}`,
      );

      const payload: Record<string, unknown> = {
        transaction_details: {
          order_id: orderId,
          gross_amount: dto.amount,
        },
      };

      if (dto.customerEmail || dto.customerPhone || dto.customerName) {
        const customerDetails: Record<string, string> = {};
        if (dto.customerName) {
          customerDetails.first_name = dto.customerName;
        }
        if (dto.customerEmail) {
          customerDetails.email = dto.customerEmail;
        }
        if (dto.customerPhone) {
          customerDetails.phone = dto.customerPhone;
        }
        payload.customer_details = customerDetails;
      }

      if (dto.description) {
        payload.item_details = [
          {
            name: dto.description.slice(0, 50),
            price: dto.amount,
            quantity: 1,
          },
        ];
      }

      const callbacks: Record<string, string> = {};
      if (dto.successRedirectUrl) {
        callbacks.finish = dto.successRedirectUrl;
      }
      if (dto.midtransOptions?.finishUrl) {
        callbacks.finish = dto.midtransOptions.finishUrl;
      }
      if (dto.midtransOptions?.unfinishUrl) {
        callbacks.unfinish = dto.midtransOptions.unfinishUrl;
      }
      if (dto.midtransOptions?.errorUrl) {
        callbacks.error = dto.midtransOptions.errorUrl;
      }
      if (Object.keys(callbacks).length > 0) {
        payload.callbacks = callbacks;
      }

      if (dto.midtransOptions?.enabledPayments) {
        payload.enabled_payments = dto.midtransOptions.enabledPayments;
      }

      if (dto.midtransOptions?.expiry) {
        const expiry: Record<string, unknown> = {};
        if (
          dto.midtransOptions.expiry.duration &&
          dto.midtransOptions.expiry.unit
        ) {
          expiry.duration = dto.midtransOptions.expiry.duration;
          expiry.unit = dto.midtransOptions.expiry.unit;
        }
        if (dto.midtransOptions.expiry.startTime) {
          expiry.start_time = dto.midtransOptions.expiry.startTime;
        }
        if (Object.keys(expiry).length > 0) {
          payload.expiry = expiry;
        }
      }

      const response = await this.client.post<MidtransSnapResponse>(
        '/snap/v1/transactions',
        payload,
      );
      const data: MidtransSnapResponse = response.data;

      this.logger.log(
        `Midtrans payment link created - orderId: ${orderId}, status: pending`,
      );

      return {
        externalId: orderId,
        checkoutUrl: data.redirect_url || data.token,
        status: 'pending',
      };
    } catch (error) {
      this.logAxiosError(error, 'payment link creation');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to create Midtrans payment link',
          code: 'MIDTRANS_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  handleCallback(payload: PaymentCallbackDto): Promise<CallbackResult> {
    const callbackBody = payload as unknown as MidtransCallbackBody;

    this.logger.log(
      `Midtrans callback received - orderId: ${callbackBody.order_id}, status: ${callbackBody.transaction_status}`,
    );
    this.logger.debug(`Midtrans callback payload: ${JSON.stringify(payload)}`);

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
      } else {
        this.logger.log('Midtrans signature verified successfully');
      }
    }

    return Promise.resolve({
      externalId: callbackBody.order_id || '',
      status: callbackBody.transaction_status || '',
      metadata: payload.metadata,
    });
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

  async savePaymentMethod(
    applicationId: string,
    dto: SavePaymentMethodDto,
  ): Promise<SavePaymentMethodResponseDto> {
    try {
      this.logger.log(
        `Saving Midtrans payment method - applicationId: ${applicationId}`,
      );

      if (!dto.cardNumber || !dto.cardExpMonth || !dto.cardExpYear) {
        throw new HttpException(
          {
            status: 'error',
            message: 'Card details are required for Midtrans',
            code: 'MISSING_CARD_DETAILS',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const orderId = `register-${applicationId}-${randomUUID().slice(0, 8)}`;

      const response = await this.client.post<MidtransCardRegisterResponse>(
        '/v2/card/register',
        {
          card_number: dto.cardNumber,
          card_exp_month: dto.cardExpMonth,
          card_exp_year: dto.cardExpYear,
          client_key:
            this.configService.get<string>('MIDTRANS_CLIENT_KEY') || '',
        },
        {
          params: {
            order_id: orderId,
          },
        },
      );
      const data = response.data;

      this.logger.log(
        `Midtrans payment method saved - orderId: ${orderId}, savedTokenId: ${data.saved_token_id}, status: ${data.status_code}`,
      );

      return {
        savedTokenId: data.saved_token_id,
        status: data.status_code === '200' ? 'SUCCESS' : 'PENDING',
        message: 'Card registered successfully',
      };
    } catch (error) {
      this.logAxiosError(error, 'save payment method');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to save Midtrans payment method',
          code: 'MIDTRANS_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
