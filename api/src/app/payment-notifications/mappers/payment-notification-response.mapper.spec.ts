import {
  PaymentNotification,
  PaymentNotificationStatus,
} from '@nexus/modules/payment-notifications';

import { toPaymentNotificationResponse } from './payment-notification-response.mapper';

function createPaymentNotification(): PaymentNotification {
  return PaymentNotification.create({
    id: 'payment-notification-1',
    customerId: 'customer-1',
    paymentDate: new Date('2026-07-20T00:00:00.000Z'),
    amount: 125.5,
    currency: 'USD',
    bankReference: 'BANK-REFERENCE-1',
    receiptFileId: 'receipt-file-1',
    invoiceIds: ['invoice-1', 'invoice-2'],
    createdAt: new Date('2026-07-21T10:00:00.000Z'),
    updatedAt: new Date('2026-07-22T11:30:00.000Z'),
  });
}

describe('toPaymentNotificationResponse', () => {
  it('maps every approved field and serializes all dates to ISO 8601', () => {
    const paymentNotification = createPaymentNotification();

    expect(toPaymentNotificationResponse(paymentNotification)).toEqual({
      id: 'payment-notification-1',
      customerId: 'customer-1',
      status: PaymentNotificationStatus.DRAFT,
      paymentDate: '2026-07-20T00:00:00.000Z',
      amount: 125.5,
      currency: 'USD',
      bankReference: 'BANK-REFERENCE-1',
      receiptFileId: 'receipt-file-1',
      invoiceIds: ['invoice-1', 'invoice-2'],
      createdAt: '2026-07-21T10:00:00.000Z',
      updatedAt: '2026-07-22T11:30:00.000Z',
    });
  });

  it('preserves an omitted receiptFileId', () => {
    const paymentNotification = PaymentNotification.create({
      id: 'payment-notification-1',
      customerId: 'customer-1',
      paymentDate: new Date('2026-07-20T00:00:00.000Z'),
      amount: 125.5,
      currency: 'USD',
      bankReference: 'BANK-REFERENCE-1',
      invoiceIds: [],
      createdAt: new Date('2026-07-21T10:00:00.000Z'),
      updatedAt: new Date('2026-07-21T10:00:00.000Z'),
    });

    expect(
      toPaymentNotificationResponse(paymentNotification).receiptFileId,
    ).toBeUndefined();
  });

  it('copies invoiceIds and returns an immutable response', () => {
    const paymentNotification = createPaymentNotification();

    const response = toPaymentNotificationResponse(paymentNotification);

    expect(response.invoiceIds).toEqual(paymentNotification.invoiceIds);
    expect(response.invoiceIds).not.toBe(paymentNotification.invoiceIds);
    expect(Object.isFrozen(response.invoiceIds)).toBe(true);
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('does not modify the entity or expose pipeline data', () => {
    const paymentNotification = createPaymentNotification();
    const original = {
      id: paymentNotification.id,
      invoiceIds: [...paymentNotification.invoiceIds],
      updatedAt: paymentNotification.updatedAt,
    };

    const response = toPaymentNotificationResponse(paymentNotification);

    expect(paymentNotification.id).toBe(original.id);
    expect(paymentNotification.invoiceIds).toEqual(original.invoiceIds);
    expect(paymentNotification.updatedAt).toEqual(original.updatedAt);
    expect(response).not.toBe(paymentNotification);
    expect(response).not.toHaveProperty('pipelineResult');
  });
});
