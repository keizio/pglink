import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from '../../applications/entities/application.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentProvider {
  XENDIT = 'XENDIT',
  MIDTRANS = 'MIDTRANS',
}

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @ManyToOne(() => Application, (application) => application.payments)
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ name: 'application_order_id', nullable: true })
  applicationOrderId: string;

  @Column({ name: 'external_id' })
  externalId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'amount' })
  amount: number;

  @Column({ name: 'currency', default: 'IDR' })
  currency: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ name: 'provider', type: 'enum', enum: PaymentProvider })
  provider: PaymentProvider;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod: string;

  @Column({ name: 'customer_email', nullable: true })
  customerEmail: string;

  @Column({ name: 'customer_phone', nullable: true })
  customerPhone: string;

  @Column({ name: 'description', nullable: true })
  description: string;

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

  @Column({ name: 'processed_at', nullable: true })
  processedAt: Date;
}
