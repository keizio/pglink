import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { MidtransProvider } from './midtrans.provider';

describe('MidtransProvider', () => {
  let provider: MidtransProvider;

  const mockConfigService = {
    get: jest.fn((key: string): string | undefined => {
      const config: Record<string, string> = {
        MIDTRANS_SERVER_KEY: 'test-server-key',
        NODE_ENV: 'development',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MidtransProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<MidtransProvider>(MidtransProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifySignature', () => {
    it('should return true for valid signature', () => {
      const payload = 'order12320050000test-server-key';
      const validSignature: string = crypto
        .createHash('sha256')
        .update(payload)
        .digest('hex');

      const result = provider.verifySignature(payload, validSignature);
      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const result = provider.verifySignature('payload', 'invalid-signature');
      expect(result).toBe(false);
    });
  });

  describe('handleCallback', () => {
    it('should handle callback and return result', async () => {
      const payload = {
        order_id: 'order-123',
        transaction_status: 'settlement',
        status_code: '200',
        gross_amount: '50000',
        signature_key: 'valid-sig',
        metadata: { productId: 'prod-456' },
      };

      const result = await provider.handleCallback(payload);

      expect(result.externalId).toBe('order-123');
      expect(result.status).toBe('settlement');
    });

    it('should handle callback with missing fields', async () => {
      const payload = {};

      const result = await provider.handleCallback(payload);

      expect(result.externalId).toBe('');
      expect(result.status).toBe('');
    });
  });

  describe('verifyCallbackToken', () => {
    it('should return true (signature verified in handleCallback)', () => {
      const result = provider.verifyCallbackToken('any-token');
      expect(result).toBe(true);
    });
  });
});
