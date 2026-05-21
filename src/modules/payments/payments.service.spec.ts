import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import {
  Payment,
  PaymentStatus,
  PaymentProvider,
} from './entities/payment.entity';
import { XenditProvider } from './providers/xendit.provider';
import { MidtransProvider } from './providers/midtrans.provider';
import { HttpException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/payment.dto';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPaymentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockXenditProvider = {
    createPayment: jest.fn(),
    handleCallback: jest.fn(),
    verifyCallbackToken: jest.fn(),
  };

  const mockMidtransProvider = {
    createPayment: jest.fn(),
    handleCallback: jest.fn(),
    verifyCallbackToken: jest.fn(),
  };

  const mockConfigService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        { provide: XenditProvider, useValue: mockXenditProvider },
        { provide: MidtransProvider, useValue: mockMidtransProvider },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    const mockApplication = {
      id: 'app-uuid-123',
      name: 'Test App',
      apiKey: 'test-api-key',
      webhookUrl: 'https://test.com/webhook',
      isActive: true,
      createdAt: new Date(),
      payments: [],
    };

    const mockPaymentResponse = {
      externalId: 'payment-ext-123',
      checkoutUrl: 'https://checkout.url',
      status: 'PENDING',
    };

    it('should create a payment successfully', async () => {
      const createDto: CreatePaymentDto = {
        amount: 10000,
        provider: PaymentProvider.XENDIT,
        currency: 'IDR',
      };

      mockXenditProvider.createPayment.mockResolvedValue(mockPaymentResponse);
      mockPaymentRepository.create.mockReturnValue({});
      mockPaymentRepository.save.mockResolvedValue({
        id: 'payment-uuid',
        ...createDto,
        externalId: mockPaymentResponse.externalId,
        status: PaymentStatus.PENDING,
      });

      const result = await service.createPayment(mockApplication, createDto);

      expect(mockXenditProvider.createPayment).toHaveBeenCalledWith(
        mockApplication.id,
        createDto,
      );
      expect(mockPaymentRepository.create).toHaveBeenCalled();
      expect(mockPaymentRepository.save).toHaveBeenCalled();
      expect(result.checkoutUrl).toBe(mockPaymentResponse.checkoutUrl);
    });

    it('should throw error for unsupported provider', async () => {
      const createDto = {
        amount: 10000,
        provider: 'INVALID' as PaymentProvider,
      };

      await expect(
        service.createPayment(mockApplication, createDto),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('findByApplication', () => {
    it('should return payments for application', async () => {
      const mockPayments = [
        { id: '1', amount: 1000 },
        { id: '2', amount: 2000 },
      ];

      mockPaymentRepository.find.mockResolvedValue(mockPayments);

      const result = await service.findByApplication('app-123');

      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: { applicationId: 'app-123' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockPayments);
    });
  });

  describe('findByExternalId', () => {
    it('should return payment by external id', async () => {
      const mockPayment = { id: 'payment-123', externalId: 'ext-123' };
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.findByExternalId('ext-123');

      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: { externalId: 'ext-123' },
      });
      expect(result).toEqual(mockPayment);
    });

    it('should return null if not found', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      const result = await service.findByExternalId('invalid');

      expect(result).toBeNull();
    });
  });

  describe('handleCallback', () => {
    it('should handle callback successfully', async () => {
      const mockPayment = {
        id: 'payment-uuid',
        externalId: 'ext-123',
        applicationId: 'app-123',
        amount: 10000,
        status: PaymentStatus.PENDING,
        application: {
          webhookUrl: 'https://test.com/webhook',
          apiKey: 'test-key',
        },
      };

      const callbackPayload = {
        external_id: 'ext-123',
        status: 'SUCCESS',
      };

      mockXenditProvider.verifyCallbackToken.mockReturnValue(true);
      mockXenditProvider.handleCallback.mockResolvedValue({
        externalId: 'ext-123',
        status: 'SUCCESS',
      });
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
        processedAt: new Date(),
      });

      const result = await service.handleCallback(
        PaymentProvider.XENDIT,
        callbackPayload,
        'valid-token',
      );

      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });

    it('should throw error for invalid callback token', async () => {
      mockXenditProvider.verifyCallbackToken.mockReturnValue(false);

      await expect(
        service.handleCallback(PaymentProvider.XENDIT, {}, 'invalid-token'),
      ).rejects.toThrow(HttpException);
    });

    it('should throw error when payment not found', async () => {
      mockXenditProvider.verifyCallbackToken.mockReturnValue(true);
      mockXenditProvider.handleCallback.mockResolvedValue({
        externalId: 'invalid-ext',
        status: 'SUCCESS',
      });
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.handleCallback(
          PaymentProvider.XENDIT,
          { external_id: 'invalid-ext' },
          'valid-token',
        ),
      ).rejects.toThrow(HttpException);
    });
  });
});
