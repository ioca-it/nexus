import type { PaymentNotification } from '@nexus/modules/payment-notifications';

import type { PaymentNotificationResponse } from '../contracts';

export function toPaymentNotificationResponse(
  paymentNotification: PaymentNotification,
): PaymentNotificationResponse {
  return Object.freeze({
    id: paymentNotification.id,
    customerId: paymentNotification.customerId,
    status: paymentNotification.status,
    paymentDate: paymentNotification.paymentDate.toISOString(),
    amount: paymentNotification.amount,
    currency: paymentNotification.currency,
    bankReference: paymentNotification.bankReference,
    receiptFileId: paymentNotification.receiptFileId,
    invoiceIds: Object.freeze([...paymentNotification.invoiceIds]),
    createdAt: paymentNotification.createdAt.toISOString(),
    updatedAt: paymentNotification.updatedAt.toISOString(),
  });
}
