import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsUrl,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider } from '../entities/payment.entity';

export class XenditPaymentLinkDto {
  @IsOptional()
  @IsString()
  successRedirectUrl?: string;

  @IsOptional()
  @IsUrl()
  failureRedirectUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  invoiceDuration?: number;
}

export class MidtransExpiryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsString()
  unit?: 'minutes' | 'hours' | 'days';

  @IsOptional()
  @IsString()
  startTime?: string;
}

export class MidtransPaymentLinkDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledPayments?: string[];

  @IsOptional()
  @IsString()
  finishUrl?: string;

  @IsOptional()
  @IsString()
  unfinishUrl?: string;

  @IsOptional()
  @IsString()
  errorUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MidtransExpiryDto)
  expiry?: MidtransExpiryDto;
}

export class CreatePaymentLinkDto {
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
  @ValidateNested()
  @Type(() => XenditPaymentLinkDto)
  xenditOptions?: XenditPaymentLinkDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MidtransPaymentLinkDto)
  midtransOptions?: MidtransPaymentLinkDto;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  successRedirectUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  failureRedirectUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
