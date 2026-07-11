import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtAccessPayload } from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtAccessPayload => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.user as unknown as JwtAccessPayload;
  },
);
