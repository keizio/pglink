import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  Payment,
  PaymentStatus,
  PaymentProvider as PaymentProviderEnum,
} from './entities/payment.entity';
import { CreatePaymentDto, PaymentCallbackDto } from './dto/payment.dto';
import { CreatePaymentLinkDto } from './dto/payment-link.dto';
import {
  SavePaymentMethodDto,
  SavePaymentMethodResponseDto,
} from './dto/save-payment-method.dto';
import { XenditProvider } from './providers/xendit.provider';
import { MidtransProvider } from './providers/midtrans.provider';
import {
  PaymentProvider,
  PaymentResponse,
  PaymentLinkResponse,
} from './providers/payment-provider.interface';
import { Application } from '../applications/entities/application.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly xenditProvider: XenditProvider,
    private readonly midtransProvider: MidtransProvider,
    private readonly configService: ConfigService,
  ) {}

  private getProvider(provider: PaymentProviderEnum): PaymentProvider {
    switch (provider) {
      case PaymentProviderEnum.XENDIT:
        return this.xenditProvider;
      case PaymentProviderEnum.MIDTRANS:
        return this.midtransProvider;
      default:
        throw new HttpException(
          {
            status: 'error',
            message: 'Unsupported payment provider',
            code: 'UNSUPPORTED_PROVIDER',
          },
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  async createPayment(
    application: Application,
    dto: CreatePaymentDto,
  ): Promise<{ data: Payment; checkoutUrl?: string }> {
    const provider = this.getProvider(dto.provider);
    const paymentResponse: PaymentResponse = await provider.createPayment(
      application.id,
      dto,
    );

    let paymentMethod: string | undefined =
      dto.xenditPaymentMethod || dto.midtransPaymentMethod;
    if (dto.midtransBankCode) {
      paymentMethod = dto.midtransBankCode;
    }

    const payment = this.paymentRepository.create({
      applicationId: application.id,

      applicationOrderId: dto.applicationOrderId,
      externalId: paymentResponse.externalId,
      amount: dto.amount,
      currency: dto.currency || 'IDR',
      status: PaymentStatus.PENDING,
      provider: dto.provider,
      paymentMethod,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      description: dto.description,
      checkoutUrl: paymentResponse.checkoutUrl,
      callbackUrl: paymentResponse.callbackUrl,
      metadata: dto.metadata,
    });

    const saved = await this.paymentRepository.save(payment);
    this.logger.log(
      `Payment created: ${saved.id} for application: ${application.id}`,
    );

    return { data: saved, checkoutUrl: paymentResponse.checkoutUrl };
  }

  async createPaymentLink(
    application: Application,
    dto: CreatePaymentLinkDto,
  ): Promise<{ data: Payment; checkoutUrl: string }> {
    const provider = this.getProvider(dto.provider);
    const paymentLinkResponse: PaymentLinkResponse =
      await provider.createPaymentLink(application.id, dto);

    const payment = this.paymentRepository.create({
      applicationId: application.id,
      applicationOrderId: dto.applicationOrderId,
      externalId: paymentLinkResponse.externalId,
      amount: dto.amount,
      currency: dto.currency || 'IDR',
      status: PaymentStatus.PENDING,
      provider: dto.provider,
      paymentMethod: 'LINK',
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      description: dto.description,
      checkoutUrl: paymentLinkResponse.checkoutUrl,
      callbackUrl: undefined,
      metadata: dto.metadata,
    });

    const saved = await this.paymentRepository.save(payment);
    this.logger.log(
      `Payment link created: ${saved.id} for application: ${application.id}`,
    );

    return { data: saved, checkoutUrl: paymentLinkResponse.checkoutUrl };
  }

  async savePaymentMethod(
    application: Application,
    dto: SavePaymentMethodDto,
  ): Promise<SavePaymentMethodResponseDto> {
    const provider = this.getProvider(dto.provider);
    const result = await provider.savePaymentMethod(application.id, dto);
    this.logger.log(`Payment method saved for application: ${application.id}`);
    return result;
  }

  async findByApplication(applicationId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByExternalId(externalId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({ where: { externalId } });
  }

  async findByExternalIdWithApplication(
    externalId: string,
  ): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { externalId },
      relations: ['application'],
    });
  }

  async handleCallback(
    provider: PaymentProviderEnum,
    payload: PaymentCallbackDto,
    callbackToken?: string,
  ): Promise<Payment> {
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

    const payment = await this.findByExternalIdWithApplication(
      callbackResult.externalId,
    );
    if (!payment) {
      this.logger.warn(
        `Payment not found for external ID: ${callbackResult.externalId}`,
      );
      throw new HttpException(
        {
          status: 'error',
          message: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const statusMap: Record<string, PaymentStatus> = {
      SUCCESS: PaymentStatus.SUCCESS,
      SUCCEEDED: PaymentStatus.SUCCESS,
      settlement: PaymentStatus.SUCCESS,
      paid: PaymentStatus.SUCCESS,
      PAID: PaymentStatus.SUCCESS,
      FAILED: PaymentStatus.FAILED,
      FAILURE: PaymentStatus.FAILED,
      EXPIRED: PaymentStatus.EXPIRED,
      expire: PaymentStatus.EXPIRED,
      PENDING: PaymentStatus.PENDING,
      pending: PaymentStatus.PENDING,
    };

    payment.status = statusMap[callbackResult.status] || PaymentStatus.PENDING;

    if (payment.processedAt && payment.status !== PaymentStatus.PENDING) {
      this.logger.log(
        `Payment ${payment.id} callback already processed at: ${payment.processedAt.toISOString()}, skipping`,
      );
      return payment;
    }

    payment.processedAt = new Date();

    const updated = await this.paymentRepository.save(payment);
    this.logger.log(
      `Payment ${payment.id} status updated to: ${payment.status}`,
    );

    await this.forwardCallbackToApplication(payment);

    return updated;
  }

  private async forwardCallbackToApplication(payment: Payment): Promise<void> {
    const application = payment.application;
    if (!application?.webhookUrl) {
      this.logger.warn(
        `No webhook URL configured for application: ${payment.applicationId}`,
      );
      return;
    }

    try {
      const callbackPayload = {
        paymentId: payment.id,
        applicationOrderId: payment.applicationOrderId,
        externalId: payment.externalId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        provider: payment.provider,
        paymentMethod: payment.paymentMethod,
        customerEmail: payment.customerEmail,
        description: payment.description,
        metadata: payment.metadata,
        processedAt: payment.processedAt,
      };

      await axios.post(application.webhookUrl, callbackPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': application.apiKey,
          'X-Payment-Id': payment.id,
        },
        timeout: 10000,
      });

      this.logger.log(
        `Callback forwarded to webhook for payment: ${payment.id}`,
      );
    } catch (error) {
      this.logger.error(`Failed to forward callback to webhook: ${error}`);
    }
  }
}
