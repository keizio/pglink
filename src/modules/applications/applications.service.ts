import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './entities/application.entity';
import {
  CreateApplicationDto,
  UpdateApplicationDto,
} from './dto/application.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  async create(
    createApplicationDto: CreateApplicationDto,
  ): Promise<Application> {
    const application = this.applicationRepository.create({
      ...createApplicationDto,
      apiKey: randomUUID().replace(/-/g, ''),
    });

    const saved = await this.applicationRepository.save(application);
    this.logger.log(`Application created: ${saved.id}`);
    return saved;
  }

  async findAll(): Promise<Application[]> {
    return this.applicationRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Application> {
    const application = await this.applicationRepository.findOne({
      where: { id },
    });
    if (!application) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Application not found',
          code: 'APPLICATION_NOT_FOUND',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return application;
  }

  async findByApiKey(apiKey: string): Promise<Application | null> {
    return this.applicationRepository.findOne({
      where: { apiKey, isActive: true },
    });
  }

  async update(
    id: string,
    updateApplicationDto: UpdateApplicationDto,
  ): Promise<Application> {
    const application = await this.findOne(id);
    Object.assign(application, updateApplicationDto);
    return this.applicationRepository.save(application);
  }

  async remove(id: string): Promise<void> {
    const application = await this.findOne(id);
    await this.applicationRepository.remove(application);
    this.logger.log(`Application deleted: ${id}`);
  }
}
