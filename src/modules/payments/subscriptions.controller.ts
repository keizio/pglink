import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import {
  CreateSubscriptionDto,
  SubscriptionCallbackDto,
  UpdateSubscriptionDto,
} from './dto/subscription.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { CurrentApplication } from '../../common/decorators/current-application.decorator';
import { Application } from '../applications/entities/application.entity';
import { SubscriptionProvider } from './entities/subscription.entity';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @CurrentApplication() application: Application,
  ) {
    return this.subscriptionsService.createSubscription(
      application,
      createSubscriptionDto,
    );
  }

  @Get()
  @UseGuards(ApiKeyGuard)
  findAll(@CurrentApplication() application: Application) {
    return this.subscriptionsService.findByApplication(application.id);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard)
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findById(id);
  }

  @Put(':id')
  @UseGuards(ApiKeyGuard)
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.updateSubscription(
      id,
      updateSubscriptionDto,
    );
  }

  @Post(':id/pause')
  @UseGuards(ApiKeyGuard)
  pause(@Param('id') id: string) {
    return this.subscriptionsService.pauseSubscription(id);
  }

  @Post(':id/resume')
  @UseGuards(ApiKeyGuard)
  resume(@Param('id') id: string) {
    return this.subscriptionsService.resumeSubscription(id);
  }

  @Delete(':id')
  @UseGuards(ApiKeyGuard)
  cancel(@Param('id') id: string) {
    return this.subscriptionsService.cancelSubscription(id);
  }

  @Post('xendit-callback')
  handleXenditCallback(
    @Body() payload: SubscriptionCallbackDto,
    @Headers('x-callback-token') callbackToken: string,
  ) {
    return this.subscriptionsService.handleCallback(
      SubscriptionProvider.XENDIT,
      payload,
      callbackToken,
    );
  }

  @Post('midtrans-callback')
  handleMidtransCallback(
    @Body() payload: SubscriptionCallbackDto,
    @Headers('x-midtrans-token') callbackToken: string,
  ) {
    return this.subscriptionsService.handleCallback(
      SubscriptionProvider.MIDTRANS,
      payload,
      callbackToken,
    );
  }
}
