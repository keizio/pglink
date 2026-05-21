import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { XenditProvider } from './xendit.provider';

describe('XenditProvider', () => {
  let provider: XenditProvider;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        XENDIT_API_KEY: 'test-api-key',
        XENDIT_WEBHOOK_TOKEN: 'test-webhook-token',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XenditProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<XenditProvider>(XenditProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyCallbackToken', () => {
    it('should return true for valid token', () => {
      const result = provider.verifyCallbackToken('test-webhook-token');
      expect(result).toBe(true);
    });

    it('should return false for invalid token', () => {
      const result = provider.verifyCallbackToken('invalid-token');
      expect(result).toBe(false);
    });

    it('should return false for undefined token', () => {
      const result = provider.verifyCallbackToken(undefined);
      expect(result).toBe(false);
    });
  });

  describe('handleCallback', () => {
    it('should handle callback and return result', async () => {
      const payload = {
        external_id: 'test-ext-123',
        status: 'SUCCESS',
        metadata: { orderId: '123' },
      };

      const result = await provider.handleCallback(payload);

      expect(result.externalId).toBe('test-ext-123');
      expect(result.status).toBe('SUCCESS');
      expect(result.metadata).toEqual({ orderId: '123' });
    });

    it('should handle callback with missing fields', async () => {
      const payload = {};

      const result = await provider.handleCallback(payload);

      expect(result.externalId).toBe('');
      expect(result.status).toBe('');
    });
  });
});
