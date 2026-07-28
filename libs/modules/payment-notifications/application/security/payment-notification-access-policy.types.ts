import type { AuthenticatedActor } from '@nexus/platform';
import type { CustomerId } from '../../domain/payment-notification.types';

export interface PaymentNotificationAccessRequest {
  readonly actor: AuthenticatedActor;
  readonly action: string;
  readonly resourceCustomerId?: CustomerId;
  readonly requireCustomer?: boolean;
}

export interface PaymentNotificationAccessDecision {
  readonly allowed: boolean;
  readonly valid: boolean;
  readonly reason: string;
}
