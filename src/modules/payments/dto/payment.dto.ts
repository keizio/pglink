import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsEmail,
  IsObject,
} from 'class-validator';
import { PaymentProvider } from '../entities/payment.entity';
import { XenditPaymentMethod } from './xendit-payment.dto';
import {
  MidtransPaymentMethod,
  MidtransBankCode,
} from './midtrans-payment.dto';

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  applicationOrderId?: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsOptional()
  @IsEnum(XenditPaymentMethod)
  xenditPaymentMethod?: XenditPaymentMethod;

  @IsOptional()
  @IsEnum(MidtransPaymentMethod)
  midtransPaymentMethod?: MidtransPaymentMethod;

  @IsOptional()
  @IsString()
  midtransBankCode?: MidtransBankCode;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class PaymentCallbackDto {
  @IsOptional()
  @IsString()
  external_id?: string;

  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  transaction_status?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  payment_type?: string;

  @IsOptional()
  @IsString()
  status_code?: string;

  @IsOptional()
  @IsString()
  gross_amount?: string;

  @IsOptional()
  @IsString()
  signature_key?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
