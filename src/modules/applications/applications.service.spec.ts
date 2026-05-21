import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApplicationsService } from './applications.service';
import { Application } from './entities/application.entity';
import { HttpException } from '@nestjs/common';

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: getRepositoryToken(Application),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an application with generated apiKey', async () => {
      const createDto = {
        name: 'Test App',
        webhookUrl: 'https://test.com/webhook',
      };
      const mockApplication = {
        id: 'uuid-123',
        name: 'Test App',
        apiKey: 'generated-api-key',
        webhookUrl: 'https://test.com/webhook',
        isActive: true,
        createdAt: new Date(),
        payments: [],
      };

      mockRepository.create.mockReturnValue(mockApplication);
      mockRepository.save.mockResolvedValue(mockApplication);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockApplication);
    });
  });

  describe('findAll', () => {
    it('should return array of applications', async () => {
      const mockApplications = [
        { id: '1', name: 'App 1' },
        { id: '2', name: 'App 2' },
      ];

      mockRepository.find.mockResolvedValue(mockApplications);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockApplications);
    });
  });

  describe('findOne', () => {
    it('should return an application by id', async () => {
      const mockApplication = { id: 'uuid-123', name: 'Test App' };
      mockRepository.findOne.mockResolvedValue(mockApplication);

      const result = await service.findOne('uuid-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
      expect(result).toEqual(mockApplication);
    });

    it('should throw HttpException when application not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('findByApiKey', () => {
    it('should return application by apiKey', async () => {
      const mockApplication = {
        id: 'uuid-123',
        apiKey: 'test-key',
        isActive: true,
      };
      mockRepository.findOne.mockResolvedValue(mockApplication);

      const result = await service.findByApiKey('test-key');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { apiKey: 'test-key', isActive: true },
      });
      expect(result).toEqual(mockApplication);
    });

    it('should return null if application not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByApiKey('invalid-key');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an application', async () => {
      const mockApplication = { id: 'uuid-123', name: 'Old Name' };
      const updateDto = { name: 'New Name' };
      const updatedApplication = { ...mockApplication, ...updateDto };

      mockRepository.findOne.mockResolvedValue(mockApplication);
      mockRepository.save.mockResolvedValue(updatedApplication);

      const result = await service.update('uuid-123', updateDto);

      expect(result.name).toBe('New Name');
    });
  });

  describe('remove', () => {
    it('should remove an application', async () => {
      const mockApplication = { id: 'uuid-123', name: 'Test App' };
      mockRepository.findOne.mockResolvedValue(mockApplication);
      mockRepository.remove.mockResolvedValue(mockApplication);

      await service.remove('uuid-123');

      expect(mockRepository.remove).toHaveBeenCalledWith(mockApplication);
    });

    it('should throw HttpException when application not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(HttpException);
    });
  });
});
