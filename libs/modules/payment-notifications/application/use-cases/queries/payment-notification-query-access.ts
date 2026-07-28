import type { AuthenticatedActor } from '@nexus/platform';
import type { CustomerId } from '../../../domain/payment-notification.types';
import { PAYMENT_NOTIFICATION_PERMISSION_ACTIONS } from '../../payment-notification-workflow';
import { evaluatePaymentNotificationAccess } from '../../security';

export function assertPaymentNotificationReadAccess(input: {
  readonly actor: AuthenticatedActor;
  readonly resourceCustomerId?: CustomerId;
  readonly requireCustomer?: boolean;
}): void {
  const decision = evaluatePaymentNotificationAccess({
    actor: input.actor,
    action: PAYMENT_NOTIFICATION_PERMISSION_ACTIONS.READ,
    resourceCustomerId: input.resourceCustomerId,
    requireCustomer: input.requireCustomer,
  });

  if (!decision.allowed) {
    throw new Error('Payment notification access denied');
  }
}
