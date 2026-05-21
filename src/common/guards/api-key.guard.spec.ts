import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApplicationsService } from '../../modules/applications/applications.service';
import { Application } from '../../modules/applications/entities/application.entity';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;

  const mockApplicationsService = {
    findByApiKey: jest.fn(),
  };

  const createMockApplication = (overrides = {}): Application => ({
    id: 'app-123',
    name: 'Test App',
    apiKey: 'test-api-key',
    webhookUrl: 'https://test.com/webhook',
    isActive: true,
    createdAt: new Date(),
    payments: [],
    subscriptions: [],
    ...overrides,
  });

  const createMockContext = (apiKey?: string): ExecutionContext => {
    const req = {
      headers: {} as Record<string, string>,
    };
    if (apiKey) {
      req.headers['x-api-key'] = apiKey;
    }
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        { provide: ApplicationsService, useValue: mockApplicationsService },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException when x-api-key header is missing', async () => {
      const context = createMockContext();

      let error: Error | null = null;
      try {
        await guard.canActivate(context);
      } catch (err) {
        error = err as Error;
      }

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({ code: 'API_KEY_REQUIRED' }),
      );
    });

    it('should throw UnauthorizedException when api key is invalid', async () => {
      const context = createMockContext('invalid-key');
      mockApplicationsService.findByApiKey.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            message: 'Invalid API key',
            code: 'INVALID_API_KEY',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should throw ForbiddenException when application is inactive', async () => {
      const context = createMockContext('test-key');
      const inactiveApp = createMockApplication({ isActive: false });
      mockApplicationsService.findByApiKey.mockResolvedValue(inactiveApp);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            message: 'Application is inactive',
            code: 'APPLICATION_INACTIVE',
          },
          HttpStatus.FORBIDDEN,
        ),
      );
    });

    it('should return true for valid active application', async () => {
      const context = createMockContext('test-key');
      const mockApp = createMockApplication();
      mockApplicationsService.findByApiKey.mockResolvedValue(mockApp);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should attach application to request for valid key', async () => {
      const mockApp = createMockApplication();
      const context = createMockContext('test-key');
      mockApplicationsService.findByApiKey.mockResolvedValue(mockApp);

      await guard.canActivate(context);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const request = context.switchToHttp().getRequest();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(request.application).toEqual(mockApp);
    });
  });
});
