import type { AuthenticatedActor } from '@nexus/platform';
import { createCatalogCustomerId, type CatalogCustomerId } from '../../domain';
import {
  evaluateCommercialCatalogAccess,
  type CommercialCatalogPermissionAction,
} from '../security';

const ACCESS_DENIED_MESSAGE = 'Commercial catalog access denied';

export function assertCommercialCatalogPermission(
  actor: AuthenticatedActor,
  action: CommercialCatalogPermissionAction,
): void {
  if (!evaluateCommercialCatalogAccess({ actor, action }).allowed) {
    throw new Error(ACCESS_DENIED_MESSAGE);
  }
}

export function requireCatalogCustomerId(
  actor: AuthenticatedActor,
): CatalogCustomerId {
  if (actor.customerId === null) {
    throw new Error(ACCESS_DENIED_MESSAGE);
  }

  return createCatalogCustomerId(actor.customerId);
}
