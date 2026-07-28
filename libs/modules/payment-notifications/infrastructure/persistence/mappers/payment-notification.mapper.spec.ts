import { PaymentNotification } from '../../../domain/payment-notification.entity';
import { PaymentNotificationStatus } from '../../../domain/payment-notification.types';
import type {
  PaymentNotificationInvoiceRecord,
  PaymentNotificationRecord,
} from '../payment-notification.persistence.types';
import { createPaymentNotificationMapper } from './payment-notification.mapper';

const PAYMENT_DATE = new Date('2026-07-20T00:00:00.000Z');
const CREATED_AT = new Date('2026-07-21T00:00:00.000Z');
const UPDATED_AT = new Date('2026-07-23T00:00:00.000Z');

function createDomain(
  overrides: {
    readonly invoiceIds?: readonly string[];
    readonly receiptFileId?: string;
  } = {},
): PaymentNotification {
  const receiptFileId =
    'receiptFileId' in overrides ? overrides.receiptFileId : 'receipt-file-1';
  const draft = PaymentNotification.create({
    id: 'payment-notification-1',
    customerId: 'customer-1',
    paymentDate: PAYMENT_DATE,
    amount: 125.5,
    currency: 'USD',
    bankReference: 'BANK-REFERENCE-1',
    receiptFileId,
    invoiceIds: overrides.invoiceIds ?? ['invoice-1', 'invoice-2'],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  });

  return draft.transitionTo(
    PaymentNotificationStatus.CHANGES_REQUESTED,
    UPDATED_AT,
  );
}

function createRecord(
  overrides: Partial<PaymentNotificationRecord> = {},
): PaymentNotificationRecord {
  return {
    id: 'payment-notification-1',
    customerId: 'customer-1',
    status: PaymentNotificationStatus.CHANGES_REQUESTED,
    paymentDate: PAYMENT_DATE.toISOString(),
    amount: 125.5,
    currency: 'USD',
    bankReference: 'BANK-REFERENCE-1',
    receiptFileId: 'receipt-file-1',
    createdAt: CREATED_AT.toISOString(),
    updatedAt: UPDATED_AT.toISOString(),
    ...overrides,
  };
}

function createInvoiceRecord(
  id: string,
  invoiceId: string,
  paymentNotificationId = 'payment-notification-1',
): PaymentNotificationInvoiceRecord {
  return {
    id,
    paymentNotificationId,
    invoiceId,
    createdAt: CREATED_AT.toISOString(),
  };
}

describe('PaymentNotificationMapper', () => {
  it('maps a domain entity to physical persistence records', () => {
    const mapper = createPaymentNotificationMapper({
      idGenerator: jest
        .fn()
        .mockReturnValueOnce('relation-1')
        .mockReturnValueOnce('relation-2'),
    });

    const result = mapper.toPersistence(createDomain());

    expect(result.notification).toEqual({
      id: 'payment-notification-1',
      customerId: 'customer-1',
      status: PaymentNotificationStatus.CHANGES_REQUESTED,
      paymentDate: PAYMENT_DATE.toISOString(),
      amount: 125.5,
      currency: 'USD',
      bankReference: 'BANK-REFERENCE-1',
      receiptFileId: 'receipt-file-1',
      createdAt: CREATED_AT.toISOString(),
      updatedAt: UPDATED_AT.toISOString(),
    });
    expect(result.invoices).toEqual([
      {
        id: 'relation-1',
        paymentNotificationId: 'payment-notification-1',
        invoiceId: 'invoice-1',
        createdAt: CREATED_AT.toISOString(),
      },
      {
        id: 'relation-2',
        paymentNotificationId: 'payment-notification-1',
        invoiceId: 'invoice-2',
        createdAt: CREATED_AT.toISOString(),
      },
    ]);
  });

  it('reconstructs a domain entity from physical records', () => {
    const mapper = createPaymentNotificationMapper({
      idGenerator: jest.fn(),
    });

    const result = mapper.toDomain(createRecord(), [
      createInvoiceRecord('relation-1', 'invoice-1'),
      createInvoiceRecord('relation-2', 'invoice-2'),
    ]);

    expect(result).toMatchObject({
      id: 'payment-notification-1',
      customerId: 'customer-1',
      status: PaymentNotificationStatus.CHANGES_REQUESTED,
      amount: 125.5,
      currency: 'USD',
      bankReference: 'BANK-REFERENCE-1',
      receiptFileId: 'receipt-file-1',
      invoiceIds: ['invoice-1', 'invoice-2'],
    });
    expect(result.paymentDate).toEqual(PAYMENT_DATE);
    expect(result.createdAt).toEqual(CREATED_AT);
    expect(result.updatedAt).toEqual(UPDATED_AT);
  });

  it('converts domain dates to ISO 8601 strings', () => {
    const mapper = createPaymentNotificationMapper({
      idGenerator: () => 'relation-1',
    });

    const result = mapper.toPersistence(createDomain());

    expect(result.notification.paymentDate).toBe(PAYMENT_DATE.toISOString());
    expect(result.notification.createdAt).toBe(CREATED_AT.toISOString());
    expect(result.notification.updatedAt).toBe(UPDATED_AT.toISOString());
    expect(result.invoices[0]?.createdAt).toBe(CREATED_AT.toISOString());
  });

  it('creates one relationship record per invoiceId', () => {
    const idGenerator = jest
      .fn()
      .mockReturnValueOnce('relation-1')
      .mockReturnValueOnce('relation-2')
      .mockReturnValueOnce('relation-3');
    const mapper = createPaymentNotificationMapper({ idGenerator });

    const result = mapper.toPersistence(
      createDomain({ invoiceIds: ['invoice-1', 'invoice-2', 'invoice-3'] }),
    );

    expect(result.invoices).toHaveLength(3);
    expect(result.invoices.map(({ invoiceId }) => invoiceId)).toEqual([
      'invoice-1',
      'invoice-2',
      'invoice-3',
    ]);
    expect(idGenerator).toHaveBeenCalledTimes(3);
  });

  it('does not embed invoiceIds in PaymentNotificationRecord', () => {
    const mapper = createPaymentNotificationMapper({
      idGenerator: () => 'relation-1',
    });

    const result = mapper.toPersistence(createDomain());

    expect('invoiceIds' in result.notification).toBe(false);
  });

  it('ignores relationships belonging to another notification', () => {
    const mapper = createPaymentNotificationMapper({
      idGenerator: jest.fn(),
    });

    const result = mapper.toDomain(createRecord(), [
      createInvoiceRecord('relation-1', 'invoice-1'),
      createInvoiceRecord('other-relation', 'other-invoice', 'other-payment'),
      createInvoiceRecord('relation-2', 'invoice-2'),
    ]);

    expect(result.invoiceIds).toEqual(['invoice-1', 'invoice-2']);
  });

  it('preserves status, createdAt, and updatedAt', () => {
    const mapper = createPaymentNotificationMapper({
      idGenerator: jest.fn(),
    });
    const record = createRecord({
      status: PaymentNotificationStatus.REJECTED,
    });

    const result = mapper.toDomain(record, []);

    expect(result.status).toBe(PaymentNotificationStatus.REJECTED);
    expect(result.createdAt).toEqual(CREATED_AT);
    expect(result.updatedAt).toEqual(UPDATED_AT);
  });

  it('preserves an optional receiptFileId in both directions', () => {
    const mapper = createPaymentNotificationMapper({
      idGenerator: jest.fn(),
    });
    const domainWithoutReceipt = createDomain({ receiptFileId: undefined });

    const persistence = mapper.toPersistence(domainWithoutReceipt);
    const domain = mapper.toDomain(
      createRecord({ receiptFileId: undefined }),
      [],
    );

    expect(persistence.notification.receiptFileId).toBeUndefined();
    expect(domain.receiptFileId).toBeUndefined();
  });

  it('allows an empty invoice collection in both directions', () => {
    const idGenerator = jest.fn();
    const mapper = createPaymentNotificationMapper({ idGenerator });

    const persistence = mapper.toPersistence(createDomain({ invoiceIds: [] }));
    const domain = mapper.toDomain(createRecord(), []);

    expect(persistence.invoices).toEqual([]);
    expect(domain.invoiceIds).toEqual([]);
    expect(idGenerator).not.toHaveBeenCalled();
  });

  it('does not modify its inputs and returns readonly physical structures', () => {
    const mapper = createPaymentNotificationMapper({
      idGenerator: () => 'relation-1',
    });
    const domain = createDomain({ invoiceIds: ['invoice-1'] });
    const notification = Object.freeze(createRecord());
    const invoices = Object.freeze([
      Object.freeze(createInvoiceRecord('relation-1', 'invoice-1')),
    ]);

    const persistence = mapper.toPersistence(domain);
    mapper.toDomain(notification, invoices);

    expect(notification).toEqual(createRecord());
    expect(invoices).toEqual([createInvoiceRecord('relation-1', 'invoice-1')]);
    expect(Object.isFrozen(persistence)).toBe(true);
    expect(Object.isFrozen(persistence.notification)).toBe(true);
    expect(Object.isFrozen(persistence.invoices)).toBe(true);
    expect(Object.isFrozen(persistence.invoices[0])).toBe(true);
  });

  it('round trips domain to persistence and back', () => {
    const mapper = createPaymentNotificationMapper({
      idGenerator: jest
        .fn()
        .mockReturnValueOnce('relation-1')
        .mockReturnValueOnce('relation-2'),
    });
    const original = createDomain();

    const persistence = mapper.toPersistence(original);
    const reconstructed = mapper.toDomain(
      persistence.notification,
      persistence.invoices,
    );

    expect(reconstructed).toEqual(original);
    expect(reconstructed).not.toBe(original);
  });
});
