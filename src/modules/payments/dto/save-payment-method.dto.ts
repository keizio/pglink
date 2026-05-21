import {
  IsString,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider } from '../entities/payment.entity';
import { XenditPaymentMethod } from './xendit-payment.dto';
import { MidtransPaymentMethod } from './midtrans-payment.dto';

export class XenditCardDetailsDto {
  @IsString()
  cardNumber: string;

  @IsString()
  expiryMonth: string;

  @IsString()
  expiryYear: string;

  @IsString()
  cvn: string;

  @IsOptional()
  @IsString()
  cardholderFirstName?: string;

  @IsOptional()
  @IsString()
  cardholderLastName?: string;

  @IsOptional()
  @IsString()
  cardholderEmail?: string;
}

export class XenditChannelPropertiesDto {
  @ValidateNested()
  @Type(() => XenditCardDetailsDto)
  cardDetails: XenditCardDetailsDto;

  @IsOptional()
  @IsString()
  initiateAuthentication?: string;
}

export class XenditCustomerDto {
  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  givenNames?: string;

  @IsOptional()
  @IsString()
  surname?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  mobileNumber?: string;
}

export class SavePaymentMethodDto {
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsOptional()
  @ValidateNested()
  @Type(() => XenditChannelPropertiesDto)
  xenditChannelProperties?: XenditChannelPropertiesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => XenditCustomerDto)
  customer?: XenditCustomerDto;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  midtransPaymentMethod?: MidtransPaymentMethod;

  @IsOptional()
  @IsString()
  cardNumber?: string;

  @IsOptional()
  @IsString()
  cardExpMonth?: string;

  @IsOptional()
  @IsString()
  cardExpYear?: string;
}

export class SavePaymentMethodResponseDto {
  @IsOptional()
  @IsString()
  paymentTokenId?: string;

  @IsOptional()
  @IsString()
  pm_id?: string;

  @IsOptional()
  @IsString()
  savedTokenId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
