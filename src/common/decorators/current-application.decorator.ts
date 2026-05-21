import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Application } from '../../modules/applications/entities/application.entity';

export const CurrentApplication = createParamDecorator(
  (data: keyof Application, ctx: ExecutionContext): Application | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    return request.application;
  },
);
