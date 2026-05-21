import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { Subscription } from '../../payments/entities/subscription.entity';

@Entity({ name: 'applications' })
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'api_key', unique: true })
  apiKey: string;

  @Column({ name: 'webhook_url', nullable: true })
  webhookUrl: string;

  @Column({ name: 'subscription_webhook_url', nullable: true })
  subscriptionWebhookUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Payment, (payment) => payment.application)
  payments: Payment[];

  @OneToMany(() => Subscription, (subscription) => subscription.application)
  subscriptions: Subscription[];
}
