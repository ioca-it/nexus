import type { AuthenticatedRequestUser } from '../authenticated-request-user.types';

export interface AuthenticatedRequest {
  readonly user: AuthenticatedRequestUser;
}
