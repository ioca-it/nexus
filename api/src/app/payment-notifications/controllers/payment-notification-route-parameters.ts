import { BadRequestException } from '@nestjs/common';
import type {
  CustomerId,
  PaymentNotificationId,
} from '@nexus/modules/payment-notifications';

function normalizeRequiredParameter(value: string, message: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new BadRequestException(message);
  }

  return normalized;
}

export function normalizePaymentNotificationId(
  id: string,
): PaymentNotificationId {
  return normalizeRequiredParameter(
    id,
    'Payment notification id is required.',
  );
}

export function normalizePaymentNotificationCustomerId(
  customerId: string,
): CustomerId {
  return normalizeRequiredParameter(
    customerId,
    'Payment notification customer id is required.',
  );
}
