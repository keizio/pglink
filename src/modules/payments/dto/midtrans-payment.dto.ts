import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum MidtransPaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  GOPAY = 'gopay',
  SHOPEEPAY = 'shopeepay',
  QRIS = 'qris',
  DANA = 'dana',
  INDOMARET = 'indomaret',
  ALFAMART = 'alfamart',
  AKULAKU = 'akulaku',
  KREDIVO = 'kredivo',
}

export enum MidtransBankCode {
  BCA = 'bca',
  BNI = 'bni',
  BRI = 'bri',
  MANDIRI = 'mandiri',
  PERMATA = 'permata',
  CIMB = 'cimb',
  DANAMON = 'danamon',
  BSI = 'bsi',
}

export class CreateMidtransPaymentDto {
  @IsEnum(MidtransPaymentMethod)
  @IsOptional()
  paymentMethod?: MidtransPaymentMethod;

  @IsOptional()
  @IsString()
  bankCode?: MidtransBankCode;
}
