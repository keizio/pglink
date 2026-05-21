import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ApplicationsService } from '../../modules/applications/applications.service';

interface RequestWithApplication {
  headers: Record<string, string>;
  application?: unknown;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly applicationsService: ApplicationsService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const apiKey = request.headers?.['x-api-key'];

    if (!apiKey) {
      throw new HttpException(
        {
          status: 'error',
          message: 'API key is required',
          code: 'API_KEY_REQUIRED',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.validateApiKey(apiKey, request);
  }

  private async validateApiKey(
    apiKey: string,
    request: RequestWithApplication,
  ): Promise<boolean> {
    const application = await this.applicationsService.findByApiKey(apiKey);

    if (!application) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Invalid API key',
          code: 'INVALID_API_KEY',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!application.isActive) {
      throw new HttpException(
        {
          status: 'error',
          message: 'Application is inactive',
          code: 'APPLICATION_INACTIVE',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    request.application = application;
    return true;
  }
}
