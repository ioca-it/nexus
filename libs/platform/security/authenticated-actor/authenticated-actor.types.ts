import type { Permission } from '../../engines/permissions';

export interface AuthenticatedActor {
  readonly userId: string;
  readonly customerId: string | null;
  readonly roles: readonly string[];
  readonly permissions: readonly Permission[];
  readonly approvalGroupIds: readonly string[];
}

export interface CreateAuthenticatedActorInput {
  readonly userId: string;
  readonly customerId: string | null;
  readonly roles: readonly string[];
  readonly permissions: readonly Permission[];
  readonly approvalGroupIds: readonly string[];
}
