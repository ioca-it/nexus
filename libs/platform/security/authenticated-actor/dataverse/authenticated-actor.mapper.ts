import type { AuthenticatedActor } from '../authenticated-actor.types';
import { createAuthenticatedActor } from '../authenticated-actor';
import type { AuthenticatedActorPersistence } from './authenticated-actor.persistence.types';

export interface AuthenticatedActorMapper {
  toAuthenticatedActor(
    persistence: AuthenticatedActorPersistence,
  ): AuthenticatedActor;
}

export function toAuthenticatedActor(
  persistence: AuthenticatedActorPersistence,
): AuthenticatedActor {
  return createAuthenticatedActor({
    userId: persistence.user.oid,
    customerId: persistence.user.customerId,
    roles: persistence.roles.map(({ role }) => role),
    permissions: persistence.permissions.map(({ module, action, effect }) => ({
      module,
      action,
      effect,
    })),
    approvalGroupIds: persistence.approvalGroupMembers.map(
      ({ approvalGroupId }) => approvalGroupId,
    ),
  });
}

export const authenticatedActorMapper: AuthenticatedActorMapper = Object.freeze(
  {
    toAuthenticatedActor,
  },
);
