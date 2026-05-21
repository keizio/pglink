import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export enum SubscriptionProvider {
  XENDIT = 'XENDIT',
  MIDTRANS = 'MIDTRANS',
}

export enum BillingCycle {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

@Entity({ name: 'subscriptions' })
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application, (application) => application.subscriptions)
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'external_subscription_id', nullable: true })
  externalSubscriptionId: string;

  @Column({ name: 'application_subscription_id', nullable: true })
  applicationSubscriptionId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'amount' })
  amount: number;

  @Column({ name: 'currency', default: 'IDR' })
  currency: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ name: 'provider', type: 'enum', enum: SubscriptionProvider })
  provider: SubscriptionProvider;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod: string;

  @Column({ name: 'customer_email', nullable: true })
  customerEmail: string;

  @Column({ name: 'customer_phone', nullable: true })
  customerPhone: string;

  @Column({ name: 'description', nullable: true })
  description: string;

  @Column({
    name: 'billing_cycle',
    type: 'enum',
    enum: BillingCycle,
    default: BillingCycle.MONTHLY,
  })
  billingCycle: BillingCycle;

  @Column({ name: 'interval_count', default: 1 })
  intervalCount: number;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date;

  @Column({ name: 'next_billing_date', type: 'timestamp', nullable: true })
  nextBillingDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ name: 'checkout_url', nullable: true })
  checkoutUrl: string;

  @Column({ name: 'callback_url', nullable: true })
  callbackUrl: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at', nullable: true })
  updatedAt: Date;

  @Column({ name: 'cancelled_at', nullable: true })
  cancelledAt: Date;
}
