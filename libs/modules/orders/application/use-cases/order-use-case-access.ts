import type { AuthenticatedActor } from '@nexus/platform';
import { createOrderCustomerId, type OrderCustomerId } from '../../domain';
import {
  evaluateOrderAccess,
  type OrderAccessRequest,
  type OrderPermissionAction,
} from '../security';

const ACCESS_DENIED_MESSAGE = 'Order access denied';

export function assertOrderAccess(request: OrderAccessRequest): void {
  if (!evaluateOrderAccess(request).allowed) {
    throw new Error(ACCESS_DENIED_MESSAGE);
  }
}

export function assertOrderPermission(
  actor: AuthenticatedActor,
  action: OrderPermissionAction,
): void {
  assertOrderAccess({ actor, action });
}

export function requireOrderCustomerId(
  actor: AuthenticatedActor,
): OrderCustomerId {
  if (actor.customerId === null) {
    throw new Error(ACCESS_DENIED_MESSAGE);
  }

  return createOrderCustomerId(actor.customerId);
}
