import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, PaymentCallbackDto } from './dto/payment.dto';
import { CreatePaymentLinkDto } from './dto/payment-link.dto';
import { SavePaymentMethodDto } from './dto/save-payment-method.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentApplication } from '../../common/decorators/current-application.decorator';
import { Application } from '../applications/entities/application.entity';
import { PaymentProvider } from './entities/payment.entity';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentApplication() application: Application,
  ) {
    return this.paymentsService.createPayment(application, createPaymentDto);
  }

  @Post('payment-link')
  @UseGuards(ApiKeyGuard)
  createPaymentLink(
    @Body() createPaymentLinkDto: CreatePaymentLinkDto,
    @CurrentApplication() application: Application,
  ) {
    return this.paymentsService.createPaymentLink(
      application,
      createPaymentLinkDto,
    );
  }

  @Post('save-payment-method')
  @UseGuards(ApiKeyGuard)
  savePaymentMethod(
    @Body() savePaymentMethodDto: SavePaymentMethodDto,
    @CurrentApplication() application: Application,
  ) {
    return this.paymentsService.savePaymentMethod(
      application,
      savePaymentMethodDto,
    );
  }

  @Get()
  @UseGuards(ApiKeyGuard)
  findAll(@CurrentApplication() application: Application) {
    return this.paymentsService.findByApplication(application.id);
  }

  @Post('xendit-callback')
  handleXenditCallback(
    @Body() payload: PaymentCallbackDto,
    @Headers('x-callback-token') callbackToken: string,
  ) {
    return this.paymentsService.handleCallback(
      PaymentProvider.XENDIT,
      payload,
      callbackToken,
    );
  }

  @Post('midtrans-callback')
  handleMidtransCallback(
    @Body() payload: PaymentCallbackDto,
    @Headers('x-midtrans-token') callbackToken: string,
  ) {
    return this.paymentsService.handleCallback(
      PaymentProvider.MIDTRANS,
      payload,
      callbackToken,
    );
  }
}
