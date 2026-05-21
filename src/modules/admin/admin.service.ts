import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import jwt from 'jsonwebtoken';
import { adminConfig } from '../../config/configuration';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import {
  Subscription,
  SubscriptionStatus,
} from '../payments/entities/subscription.entity';
import { Application } from '../applications/entities/application.entity';
import {
  AdminPaymentQueryDto,
  PaymentStatusFilter,
} from './dto/admin-payment-query.dto';
import {
  AdminSubscriptionQueryDto,
  SubscriptionStatusFilter,
} from './dto/admin-subscription-query.dto';
import {
  PaginatedResponse,
  PaymentData,
  SubscriptionData,
} from './dto/admin-response.dto';
import {
  DashboardSummary,
  DailyTrend,
  RecentActivity,
} from './dto/admin-dashboard.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  validateCredentials(username: string, password: string): boolean {
    return (
      username === adminConfig.username && password === adminConfig.password
    );
  }

  login(username: string, password: string): { token: string } {
    if (!this.validateCredentials(username, password)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { token: this.generateToken(username) };
  }

  private generateToken(username: string): string {
    const payload = { sub: username, role: 'admin' };
    const secret =
      this.configService.get<string>('JWT_SECRET') || 'your-jwt-secret';

    return jwt.sign(payload, secret, { expiresIn: '1d' });
  }

  async getApplications(): Promise<Application[]> {
    return this.applicationRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getApplicationById(id: string): Promise<Application | null> {
    return this.applicationRepository.findOne({ where: { id } });
  }

  async getPayments(
    query: AdminPaymentQueryDto,
  ): Promise<PaginatedResponse<PaymentData>> {
    const {
      page = 1,
      limit = 10,
      applicationId,
      status,
      startDate,
      endDate,
    } = query ?? {};

    const skip = (page - 1) * limit;

    const whereConditions: Record<string, unknown> = {};

    if (applicationId) {
      whereConditions.applicationId = applicationId;
    }

    if (status) {
      whereConditions.status = this.mapPaymentStatus(status);
    }

    if (startDate) {
      const start = new Date(startDate);
      if (endDate) {
        whereConditions.createdAt = Between(start, new Date(endDate));
      } else {
        whereConditions.createdAt = MoreThanOrEqual(start);
      }
    } else if (endDate) {
      whereConditions.createdAt = LessThanOrEqual(new Date(endDate));
    }

    const [payments, total] = await this.paymentRepository.findAndCount({
      where: whereConditions,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: ['application'],
    });

    const data: PaymentData[] = payments.map((payment) => ({
      id: payment.id,
      applicationId: payment.applicationId,
      applicationOrderId: payment.applicationOrderId,
      externalId: payment.externalId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      paymentMethod: payment.paymentMethod,
      customerEmail: payment.customerEmail,
      description: payment.description,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSubscriptions(
    query: AdminSubscriptionQueryDto,
  ): Promise<PaginatedResponse<SubscriptionData>> {
    const {
      page = 1,
      limit = 10,
      applicationId,
      status,
      startDate,
      endDate,
    } = query ?? {};

    const skip = (page - 1) * limit;

    const whereConditions: Record<string, unknown> = {};

    if (applicationId) {
      whereConditions.applicationId = applicationId;
    }

    if (status) {
      whereConditions.status = this.mapSubscriptionStatus(status);
    }

    if (startDate) {
      const start = new Date(startDate);
      if (endDate) {
        whereConditions.createdAt = Between(start, new Date(endDate));
      } else {
        whereConditions.createdAt = MoreThanOrEqual(start);
      }
    } else if (endDate) {
      whereConditions.createdAt = LessThanOrEqual(new Date(endDate));
    }

    const [subscriptions, total] =
      await this.subscriptionRepository.findAndCount({
        where: whereConditions,
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
        relations: ['application'],
      });

    const data: SubscriptionData[] = subscriptions.map((subscription) => ({
      id: subscription.id,
      applicationId: subscription.applicationId,
      applicationSubscriptionId: subscription.applicationSubscriptionId,
      externalSubscriptionId: subscription.externalSubscriptionId,
      amount: Number(subscription.amount),
      currency: subscription.currency,
      status: subscription.status,
      provider: subscription.provider,
      paymentMethod: subscription.paymentMethod,
      customerEmail: subscription.customerEmail,
      description: subscription.description,
      billingCycle: subscription.billingCycle,
      startDate: subscription.startDate,
      nextBillingDate: subscription.nextBillingDate,
      endDate: subscription.endDate,
      createdAt: subscription.createdAt,
      cancelledAt: subscription.cancelledAt,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private mapPaymentStatus(status: PaymentStatusFilter): PaymentStatus {
    const statusMap: Record<PaymentStatusFilter, PaymentStatus> = {
      [PaymentStatusFilter.PENDING]: PaymentStatus.PENDING,
      [PaymentStatusFilter.SUCCESS]: PaymentStatus.SUCCESS,
      [PaymentStatusFilter.FAILED]: PaymentStatus.FAILED,
      [PaymentStatusFilter.EXPIRED]: PaymentStatus.EXPIRED,
    };
    return statusMap[status];
  }

  private mapSubscriptionStatus(
    status: SubscriptionStatusFilter,
  ): SubscriptionStatus {
    const statusMap: Record<SubscriptionStatusFilter, SubscriptionStatus> = {
      [SubscriptionStatusFilter.ACTIVE]: SubscriptionStatus.ACTIVE,
      [SubscriptionStatusFilter.PAUSED]: SubscriptionStatus.PAUSED,
      [SubscriptionStatusFilter.CANCELLED]: SubscriptionStatus.CANCELLED,
      [SubscriptionStatusFilter.EXPIRED]: SubscriptionStatus.EXPIRED,
      [SubscriptionStatusFilter.FAILED]: SubscriptionStatus.FAILED,
    };
    return statusMap[status];
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [
      applicationStats,
      paymentStats,
      subscriptionStats,
      dailyTrends,
      recentPayments,
      recentSubscriptions,
    ] = await Promise.all([
      this.getApplicationStats(),
      this.getPaymentStats(),
      this.getSubscriptionStats(),
      this.getDailyTrends(),
      this.paymentRepository.find({
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['application'],
      }),
      this.subscriptionRepository.find({
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['application'],
      }),
    ]);

    const recentActivity: RecentActivity[] = [
      ...recentPayments.map((p) => ({
        id: p.id,
        type: 'payment' as const,
        action: 'Payment ' + p.status.toLowerCase(),
        description: `${p.application?.name || 'Unknown'} - ${p.applicationOrderId || p.externalId}`,
        amount: Number(p.amount),
        status: p.status,
        createdAt: p.createdAt,
      })),
      ...recentSubscriptions.map((s) => ({
        id: s.id,
        type: 'subscription' as const,
        action: 'Subscription ' + s.status.toLowerCase(),
        description: `${s.application?.name || 'Unknown'} - ${s.applicationSubscriptionId || s.externalSubscriptionId}`,
        amount: Number(s.amount),
        status: s.status,
        createdAt: s.createdAt,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 10);

    const totalTransactions = paymentStats.total + subscriptionStats.total;
    const successPayments = paymentStats.success + subscriptionStats.active;
    const successRate =
      totalTransactions > 0
        ? Math.round((successPayments / totalTransactions) * 100)
        : 0;

    return {
      applications: applicationStats,
      payments: paymentStats,
      subscriptions: subscriptionStats,
      transactions: {
        totalTransactions,
        totalVolume: paymentStats.totalAmount + subscriptionStats.totalAmount,
        successRate,
        dailyTrend: dailyTrends,
      },
      recentActivity,
    };
  }

  private async getApplicationStats() {
    const total = await this.applicationRepository.count();
    const active = await this.applicationRepository.count({
      where: { isActive: true },
    });

    return {
      total,
      active,
      inactive: total - active,
    };
  }

  private async getPaymentStats() {
    const total = await this.paymentRepository.count();
    const pending = await this.paymentRepository.count({
      where: { status: PaymentStatus.PENDING },
    });
    const success = await this.paymentRepository.count({
      where: { status: PaymentStatus.SUCCESS },
    });
    const failed = await this.paymentRepository.count({
      where: { status: PaymentStatus.FAILED },
    });
    const expired = await this.paymentRepository.count({
      where: { status: PaymentStatus.EXPIRED },
    });

    const totalAmountResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .getRawOne<{ total: string }>();

    const successAmountResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .getRawOne<{ total: string }>();

    return {
      total,
      pending,
      success,
      failed,
      expired,
      totalAmount: Number(totalAmountResult?.total || 0),
      successAmount: Number(successAmountResult?.total || 0),
    };
  }

  private async getSubscriptionStats() {
    const total = await this.subscriptionRepository.count();
    const active = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });
    const paused = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.PAUSED },
    });
    const cancelled = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.CANCELLED },
    });
    const expired = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.EXPIRED },
    });
    const failed = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.FAILED },
    });

    const totalAmountResult = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('SUM(subscription.amount)', 'total')
      .getRawOne<{ total: string }>();

    const activeAmountResult = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('SUM(subscription.amount)', 'total')
      .where('subscription.status = :status', {
        status: SubscriptionStatus.ACTIVE,
      })
      .getRawOne<{ total: string }>();

    return {
      total,
      active,
      paused,
      cancelled,
      expired,
      failed,
      totalAmount: Number(totalAmountResult?.total || 0),
      activeAmount: Number(activeAmountResult?.total || 0),
    };
  }

  private async getDailyTrends(): Promise<DailyTrend[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const payments = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('DATE(payment.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(payment.amount)', 'amount')
      .where('payment.created_at >= :date', { date: thirtyDaysAgo })
      .groupBy('DATE(payment.created_at)')
      .getRawMany<{ date: string; count: string; amount: string }>();

    const subscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('DATE(subscription.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(subscription.amount)', 'amount')
      .where('subscription.created_at >= :date', { date: thirtyDaysAgo })
      .groupBy('DATE(subscription.created_at)')
      .getRawMany<{ date: string; count: string; amount: string }>();

    const trends: Map<string, DailyTrend> = new Map();

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      trends.set(dateStr, {
        date: dateStr,
        payments: 0,
        subscriptions: 0,
        amount: 0,
      });
    }

    payments.forEach((p: { date: string; count: string; amount: string }) => {
      const existing = trends.get(p.date);
      if (existing) {
        existing.payments = parseInt(p.count) || 0;
        existing.amount += Number(p.amount) || 0;
      }
    });

    subscriptions.forEach(
      (s: { date: string; count: string; amount: string }) => {
        const existing = trends.get(s.date);
        if (existing) {
          existing.subscriptions = parseInt(s.count) || 0;
          existing.amount += Number(s.amount) || 0;
        }
      },
    );

    return Array.from(trends.values()).reverse();
  }
}
