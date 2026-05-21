import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsEmail,
  IsObject,
  IsDateString,
} from 'class-validator';
import { SubscriptionProvider } from '../entities/subscription.entity';
import { BillingCycle } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @IsOptional()
  @IsString()
  applicationSubscriptionId?: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(SubscriptionProvider)
  provider: SubscriptionProvider;

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
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsNumber()
  intervalCount?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SubscriptionCallbackDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  external_id?: string;

  @IsOptional()
  @IsString()
  subscription_id?: string;

  @IsOptional()
  @IsString()
  reference_id?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  event?: string;

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

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionProvider)
  provider?: SubscriptionProvider;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @IsOptional()
  @IsNumber()
  intervalCount?: number;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
