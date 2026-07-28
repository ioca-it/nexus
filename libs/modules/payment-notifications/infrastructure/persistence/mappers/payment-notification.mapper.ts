import { PaymentNotification } from '../../../domain/payment-notification.entity';
import {
  PaymentNotificationStatus,
  type PaymentNotificationStatus as PaymentNotificationStatusType,
} from '../../../domain/payment-notification.types';
import type {
  PaymentNotificationInvoiceRecord,
  PaymentNotificationRecord,
} from '../payment-notification.persistence.types';

export type IdGenerator = () => string;

export interface PaymentNotificationPersistence {
  readonly notification: PaymentNotificationRecord;
  readonly invoices: readonly PaymentNotificationInvoiceRecord[];
}

export interface PaymentNotificationMapper {
  readonly toPersistence: (
    notification: PaymentNotification,
  ) => PaymentNotificationPersistence;
  readonly toDomain: (
    notification: PaymentNotificationRecord,
    invoices: readonly PaymentNotificationInvoiceRecord[],
  ) => PaymentNotification;
}

export interface CreatePaymentNotificationMapperDependencies {
  readonly idGenerator: IdGenerator;
}

export function createPaymentNotificationMapper(
  dependencies: CreatePaymentNotificationMapperDependencies,
): PaymentNotificationMapper {
  return Object.freeze({
    toPersistence(
      notification: PaymentNotification,
    ): PaymentNotificationPersistence {
      const paymentDate = notification.paymentDate.toISOString();
      const createdAt = notification.createdAt.toISOString();
      const updatedAt = notification.updatedAt.toISOString();
      const notificationRecord: PaymentNotificationRecord = Object.freeze({
        id: notification.id,
        customerId: notification.customerId,
        status: notification.status,
        paymentDate,
        amount: notification.amount,
        currency: notification.currency,
        bankReference: notification.bankReference,
        receiptFileId: notification.receiptFileId,
        createdAt,
        updatedAt,
      });
      const invoiceRecords = Object.freeze(
        notification.invoiceIds.map((invoiceId) =>
          Object.freeze({
            id: dependencies.idGenerator(),
            paymentNotificationId: notification.id,
            invoiceId,
            createdAt,
          }),
        ),
      );

      return Object.freeze({
        notification: notificationRecord,
        invoices: invoiceRecords,
      });
    },

    toDomain(
      notification: PaymentNotificationRecord,
      invoices: readonly PaymentNotificationInvoiceRecord[],
    ): PaymentNotification {
      const invoiceIds: string[] = [];

      for (const invoice of invoices) {
        if (invoice.paymentNotificationId === notification.id) {
          invoiceIds.push(invoice.invoiceId);
        }
      }

      const updatedAt = new Date(notification.updatedAt);
      const paymentNotification = PaymentNotification.create({
        id: notification.id,
        customerId: notification.customerId,
        paymentDate: new Date(notification.paymentDate),
        amount: notification.amount,
        currency: notification.currency,
        bankReference: notification.bankReference,
        receiptFileId: notification.receiptFileId,
        invoiceIds,
        createdAt: new Date(notification.createdAt),
        updatedAt,
      });

      if (notification.status === PaymentNotificationStatus.DRAFT) {
        return paymentNotification;
      }

      return paymentNotification.transitionTo(
        notification.status as PaymentNotificationStatusType,
        updatedAt,
      );
    },
  });
}

const defaultPaymentNotificationMapper = createPaymentNotificationMapper({
  idGenerator: () => {
    if (typeof globalThis.crypto?.randomUUID !== 'function') {
      throw new Error('crypto.randomUUID is not available');
    }

    return globalThis.crypto.randomUUID();
  },
});

export const toPersistence = defaultPaymentNotificationMapper.toPersistence;
export const toDomain = defaultPaymentNotificationMapper.toDomain;
