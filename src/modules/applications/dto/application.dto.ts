import {
  IsString,
  IsOptional,
  IsUrl,
  MinLength,
  IsBoolean,
} from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @IsOptional()
  @IsUrl()
  subscriptionWebhookUrl?: string;
}

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @IsOptional()
  @IsUrl()
  subscriptionWebhookUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
