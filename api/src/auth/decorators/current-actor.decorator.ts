import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedActor } from '@nexus/platform';

import type { AuthenticatedRequest } from './authenticated-request.types';

export const CurrentActor = createParamDecorator<undefined, AuthenticatedActor>(
  (_data: undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user?.actor) {
      throw new UnauthorizedException('Authentication required.');
    }

    return request.user.actor;
  },
);
