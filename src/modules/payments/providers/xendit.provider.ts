import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import {
  PaymentProvider,
  PaymentResponse,
  CallbackResult,
  PaymentLinkResponse,
} from './payment-provider.interface';
import { CreatePaymentDto, PaymentCallbackDto } from '../dto/payment.dto';
import { CreatePaymentLinkDto } from '../dto/payment-link.dto';
import { XenditPaymentMethod } from '../dto/xendit-payment.dto';
import {
  SavePaymentMethodDto,
  SavePaymentMethodResponseDto,
} from '../dto/save-payment-method.dto';

interface XenditInvoiceResponse {
  external_id: string;
  invoice_url: string;
  callback_virtual_account_created?: string;
  status: string;
}

interface XenditPaymentTokenResponse {
  payment_token_id: string;
  payment_method_id?: string;
  status: string;
}

@Injectable()
export class XenditProvider implements PaymentProvider {
  private readonly logger = new Logger(XenditProvider.name);
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
        `Xendit ${context} failed - URL: ${axiosError.config?.url || 'unknown'}, ` +
          `Method: ${axiosError.config?.method?.toUpperCase() || 'unknown'}, ` +
          `Status: ${axiosError.response?.status || 'no response'}, ` +
          `Response: ${JSON.stringify(axiosError.response?.data) || 'no data'}, ` +
          `Message: ${axiosError.message}`,
        axiosError.stack,
      );
    } else {
      this.logger.error(`Xendit ${context} failed: ${String(error)}`);
    }
  }

  async createPayment(
    _applicationId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentResponse> {
    try {
      const externalId = `payment-${_applicationId}-${randomUUID()}`;

      const paymentMethod = dto.xenditPaymentMethod || XenditPaymentMethod.BCA;

      this.logger.log(
        `Creating Xendit payment - applicationId: ${_applicationId}, amount: ${dto.amount}, method: ${paymentMethod}`,
      );

      const payload: Record<string, unknown> = {
        external_id: externalId,
        amount: dto.amount,
        currency: dto.currency || 'IDR',
        description: dto.description || 'Payment via PGLink',
        metadata: dto.metadata || {},
      };

      if (paymentMethod === XenditPaymentMethod.CARD) {
        payload.payment_method = 'CARD';
      } else if (
        [
          XenditPaymentMethod.OVO,
          XenditPaymentMethod.DANA,
          XenditPaymentMethod.LINKAJA,
          XenditPaymentMethod.SHOPEEPAY,
          XenditPaymentMethod.GRABPAY,
          XenditPaymentMethod.PAYMAYA,
        ].includes(paymentMethod)
      ) {
        payload.payment_method = 'EWALLET';
        payload.ewallet_type = paymentMethod;
      } else if (paymentMethod === XenditPaymentMethod.QRIS) {
        payload.payment_method = 'QR_CODE';
        payload.qr_code_type = 'DYNAMIC';
      } else {
        payload.payment_method = 'BANK_TRANSFER';
        payload.bank_code = paymentMethod;
      }

      if (dto.customerEmail || dto.customerPhone) {
        payload.customer = {
          email: dto.customerEmail,
          phone: dto.customerPhone,
        };
      }

      this.logger.debug(
        `Xendit createPayment payload: ${JSON.stringify(payload)}`,
      );

      const response = await this.client.post<XenditInvoiceResponse>(
        '/v2/invoices',
        payload,
      );
      const data = response.data;

      this.logger.log(
        `Xendit payment created - externalId: ${data.external_id}, status: ${data.status}, invoiceUrl: ${data.invoice_url}`,
      );

      return {
        externalId: data.external_id,
        checkoutUrl: data.invoice_url,
        callbackUrl: data.callback_virtual_account_created,
        status: data.status,
      };
    } catch (error) {
      this.logAxiosError(error, 'payment creation');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to create Xendit payment',
          code: 'XENDIT_ERROR',
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
      const externalId = `payment-link-${_applicationId}-${randomUUID()}`;

      this.logger.log(
        `Creating Xendit payment link - applicationId: ${_applicationId}, amount: ${dto.amount}`,
      );

      const payload: Record<string, unknown> = {
        external_id: externalId,
        amount: dto.amount,
        currency: dto.currency || 'IDR',
        description: dto.description || 'Payment via PGLink',
        metadata: {},
      };

      if (dto.successRedirectUrl) {
        payload.success_redirect_url = dto.successRedirectUrl;
      }

      if (dto.failureRedirectUrl) {
        payload.failure_redirect_url = dto.failureRedirectUrl;
      }

      if (dto.xenditOptions?.invoiceDuration) {
        payload.invoice_duration = dto.xenditOptions.invoiceDuration;
      }

      if (dto.customerEmail || dto.customerPhone || dto.customerName) {
        const customer: Record<string, string> = {};
        if (dto.customerName) {
          const nameParts = dto.customerName.split(' ');
          customer.given_names = nameParts[0];
          if (nameParts.length > 1) {
            customer.surname = nameParts.slice(1).join(' ');
          }
        }
        if (dto.customerEmail) {
          customer.email = dto.customerEmail;
        }
        if (dto.customerPhone) {
          customer.mobile_number = dto.customerPhone;
        }
        payload.customer = customer;
      }

      this.logger.debug(
        `Xendit createPaymentLink payload: ${JSON.stringify(payload)}`,
      );

      const response = await this.client.post<XenditInvoiceResponse>(
        '/v2/invoices',
        payload,
      );
      const data = response.data;

      this.logger.log(
        `Xendit payment link created - externalId: ${data.external_id}, status: ${data.status}`,
      );

      return {
        externalId: data.external_id,
        checkoutUrl: data.invoice_url,
        status: data.status,
      };
    } catch (error) {
      this.logAxiosError(error, 'payment link creation');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to create Xendit payment link',
          code: 'XENDIT_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  handleCallback(payload: PaymentCallbackDto): Promise<CallbackResult> {
    this.logger.log(
      `Xendit callback received - externalId: ${payload.external_id}, status: ${payload.status}`,
    );
    this.logger.debug(`Xendit callback payload: ${JSON.stringify(payload)}`);

    return Promise.resolve({
      externalId: payload.external_id || '',
      status: payload.status || '',
      metadata: payload.metadata,
    });
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

  async savePaymentMethod(
    applicationId: string,
    dto: SavePaymentMethodDto,
  ): Promise<SavePaymentMethodResponseDto> {
    try {
      const referenceId = `tok-${randomUUID().slice(0, 16)}`;

      this.logger.log(
        `Saving Xendit payment method - applicationId: ${applicationId}, channelCode: 'CARDS'}`,
      );

      if (!dto.xenditChannelProperties?.cardDetails) {
        throw new HttpException(
          {
            status: 'error',
            message: 'Card details are required for CARD payment method',
            code: 'MISSING_CARD_DETAILS',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const payload: Record<string, unknown> = {
        reference_id: referenceId,
        country: dto.country || 'ID',
        currency: dto.currency || 'IDR',
        channel_code: 'CARDS',
        channel_properties: {},
      };

      if (dto.customer) {
        if (dto.customer.referenceId) {
          payload.customer_id = dto.customer.referenceId;
        } else {
          payload.customer_id = `cust-${randomUUID()}`;
        }
      } else {
        payload.customer_id = `cust-${randomUUID()}`;
      }

      if (dto.xenditChannelProperties?.cardDetails) {
        const channelProperties: Record<string, unknown> = {
          card_details: {
            cvn: dto.xenditChannelProperties.cardDetails.cvn,
            card_number: dto.xenditChannelProperties.cardDetails.cardNumber,
            expiry_year:
              dto.xenditChannelProperties.cardDetails.expiryYear.length === 2
                ? `20${dto.xenditChannelProperties.cardDetails.expiryYear}`
                : dto.xenditChannelProperties.cardDetails.expiryYear,
            expiry_month: dto.xenditChannelProperties.cardDetails.expiryMonth,
            cardholder_first_name:
              dto.xenditChannelProperties.cardDetails.cardholderFirstName,
            cardholder_last_name:
              dto.xenditChannelProperties.cardDetails.cardholderLastName,
            cardholder_email:
              dto.xenditChannelProperties.cardDetails.cardholderEmail,
          },
        };

        if (dto.xenditChannelProperties.initiateAuthentication) {
          channelProperties.initiate_authentication =
            dto.xenditChannelProperties.initiateAuthentication;
        } else {
          channelProperties.initiate_authentication = true;
        }

        payload.channel_properties = channelProperties;
      }

      this.logger.debug(
        `Xendit savePaymentMethod payload: ${JSON.stringify(payload)}`,
      );

      const response = await this.client.post<XenditPaymentTokenResponse>(
        '/v3/payment_tokens',
        payload,
      );
      const data = response.data;

      this.logger.log(
        `Xendit payment method saved - paymentTokenId: ${data.payment_token_id}, status: ${data.status}`,
      );

      return {
        paymentTokenId: data.payment_token_id,
        pm_id: data.payment_method_id,
        status: data.status,
        message: 'Payment method saved successfully',
      };
    } catch (error) {
      this.logAxiosError(error, 'save payment method');
      throw new HttpException(
        {
          status: 'error',
          message: 'Failed to save Xendit payment method',
          code: 'XENDIT_ERROR',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
