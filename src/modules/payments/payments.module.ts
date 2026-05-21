import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Subscription } from './entities/subscription.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { XenditProvider } from './providers/xendit.provider';
import { MidtransProvider } from './providers/midtrans.provider';
import { XenditSubscriptionProvider } from './providers/xendit-subscription.provider';
import { MidtransSubscriptionProvider } from './providers/midtrans-subscription.provider';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Subscription]),
    ApplicationsModule,
  ],
  controllers: [PaymentsController, SubscriptionsController],
  providers: [
    PaymentsService,
    SubscriptionsService,
    XenditProvider,
    MidtransProvider,
    XenditSubscriptionProvider,
    MidtransSubscriptionProvider,
  ],
  exports: [PaymentsService, SubscriptionsService],
})
export class PaymentsModule {}
