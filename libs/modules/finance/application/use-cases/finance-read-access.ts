import type { AuthenticatedActor } from '@nexus/platform';
import {
  createNexusCustomerId,
  type BusinessCentralCustomerId,
} from '../../domain';
import type { CustomerBusinessCentralReferenceResolver } from '../customer-reference';
import {
  evaluateFinanceAccess,
  type FinancePermissionAction,
} from '../security';

const ACCESS_DENIED_MESSAGE = 'Finance access denied';

export function assertFinancePermission(
  actor: AuthenticatedActor,
  action: FinancePermissionAction,
): void {
  if (!evaluateFinanceAccess({ actor, action }).allowed) {
    throw new Error(ACCESS_DENIED_MESSAGE);
  }
}

export async function resolveCustomerReference(
  actor: AuthenticatedActor,
  resolver: CustomerBusinessCentralReferenceResolver,
): Promise<BusinessCentralCustomerId> {
  if (actor.customerId === null) {
    throw new Error(ACCESS_DENIED_MESSAGE);
  }

  const businessCentralCustomerId = await resolver.resolveByNexusCustomerId(
    createNexusCustomerId(actor.customerId),
  );

  if (businessCentralCustomerId === null) {
    throw new Error(ACCESS_DENIED_MESSAGE);
  }

  return businessCentralCustomerId;
}

export function assertCustomerOwnsResource(
  expectedCustomerId: BusinessCentralCustomerId,
  actualCustomerId: BusinessCentralCustomerId,
): void {
  if (expectedCustomerId !== actualCustomerId) {
    throw new Error(ACCESS_DENIED_MESSAGE);
  }
}
