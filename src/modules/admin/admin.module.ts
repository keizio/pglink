import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Payment } from '../payments/entities/payment.entity';
import { Subscription } from '../payments/entities/subscription.entity';
import { Application } from '../applications/entities/application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Subscription, Application])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
