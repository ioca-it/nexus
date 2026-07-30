import {
  evaluatePermission,
  type AuthenticatedActor,
  type PermissionDecision,
} from '@nexus/platform';
import type { OrderCustomerId } from '../../domain';

export const ORDERS_PERMISSION_MODULE = 'orders';

export const ORDERS_PERMISSION_ACTIONS = Object.freeze({
  CREATE_DRAFT: 'create_draft',
  UPDATE_DRAFT: 'update_draft',
  READ_ORDERS: 'read_orders',
} as const);

export type OrderPermissionAction =
  (typeof ORDERS_PERMISSION_ACTIONS)[keyof typeof ORDERS_PERMISSION_ACTIONS];

export interface OrderAccessRequest {
  readonly actor: AuthenticatedActor;
  readonly action: OrderPermissionAction;
  readonly resourceCustomerId?: OrderCustomerId;
  readonly requireCustomer?: boolean;
}

export type OrderAccessDecision = Readonly<PermissionDecision>;

const CUSTOMER_REQUIRED_REASON = 'Order customer context is required';
const CUSTOMER_MISMATCH_REASON = 'Order customer ownership mismatch';
const ACCESS_ALLOWED_REASON = 'Order access allowed';

function decision(allowed: boolean, reason: string): OrderAccessDecision {
  return Object.freeze({ allowed, reason });
}

export function evaluateOrderAccess(
  request: OrderAccessRequest,
): OrderAccessDecision {
  const permissionDecision = evaluatePermission({
    permissions: request.actor.permissions,
    module: ORDERS_PERMISSION_MODULE,
    action: request.action,
  });

  if (!permissionDecision.allowed) {
    return decision(false, permissionDecision.reason);
  }

  if (request.requireCustomer && request.actor.customerId === null) {
    return decision(false, CUSTOMER_REQUIRED_REASON);
  }

  if (
    request.resourceCustomerId !== undefined &&
    request.actor.customerId !== null &&
    request.actor.customerId !== request.resourceCustomerId
  ) {
    return decision(false, CUSTOMER_MISMATCH_REASON);
  }

  return decision(true, ACCESS_ALLOWED_REASON);
}
