import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthenticatedRequestUser } from '../authenticated-request-user.types';
import type { AuthenticatedRequest } from './authenticated-request.types';

export const CurrentUser = createParamDecorator<
  undefined,
  AuthenticatedRequestUser
>((_data: undefined, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

  if (!request.user) {
    throw new UnauthorizedException('Authentication required.');
  }

  return request.user;
});
