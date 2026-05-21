import { IsEnum, IsOptional } from 'class-validator';

export enum XenditPaymentMethod {
  BCA = 'BCA',
  BRI = 'BRI',
  BNI = 'BNI',
  MANDIRI = 'MANDIRI',
  PERMATA = 'PERMATA',
  CIMB = 'CIMB',
  DANAMON = 'DANAMON',
  BSI = 'BSI',
  OVO = 'OVO',
  DANA = 'DANA',
  LINKAJA = 'LINKAJA',
  SHOPEEPAY = 'SHOPEEPAY',
  GRABPAY = 'GRABPAY',
  PAYMAYA = 'PAYMAYA',
  CARD = 'CARD',
  QRIS = 'QRIS',
}

export class CreateXenditPaymentDto {
  @IsEnum(XenditPaymentMethod)
  @IsOptional()
  paymentMethod?: XenditPaymentMethod;
}
