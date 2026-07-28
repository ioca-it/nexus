import { evaluatePermission } from '@nexus/platform';
import { PAYMENT_NOTIFICATIONS_PERMISSION_MODULE } from '../payment-notification-workflow';
import type {
  PaymentNotificationAccessDecision,
  PaymentNotificationAccessRequest,
} from './payment-notification-access-policy.types';

const ACCESS_ALLOWED_REASON = 'Payment notification access allowed';
const CUSTOMER_REQUIRED_REASON = 'Customer context is required';
const CUSTOMER_MISMATCH_REASON = 'Payment notification access denied';

function createDecision(
  allowed: boolean,
  reason: string,
): PaymentNotificationAccessDecision {
  return Object.freeze({
    allowed,
    valid: true,
    reason,
  });
}

export function evaluatePaymentNotificationAccess(
  request: PaymentNotificationAccessRequest,
): PaymentNotificationAccessDecision {
  const permissionDecision = evaluatePermission({
    permissions: request.actor.permissions,
    module: PAYMENT_NOTIFICATIONS_PERMISSION_MODULE,
    action: request.action,
  });

  if (!permissionDecision.allowed) {
    return createDecision(false, permissionDecision.reason);
  }

  if (request.requireCustomer && request.actor.customerId === null) {
    return createDecision(false, CUSTOMER_REQUIRED_REASON);
  }

  if (
    request.resourceCustomerId !== undefined &&
    request.actor.customerId !== null &&
    request.actor.customerId !== request.resourceCustomerId
  ) {
    return createDecision(false, CUSTOMER_MISMATCH_REASON);
  }

  return createDecision(true, ACCESS_ALLOWED_REASON);
}
