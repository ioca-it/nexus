import { PaymentNotification } from './payment-notification.entity';
import {
  PaymentNotificationStatus,
  type CreatePaymentNotificationInput,
  type PaymentNotificationEditableDetails,
  type PaymentNotificationStatus as PaymentNotificationStatusType,
} from './payment-notification.types';

function createInput(
  overrides: Partial<CreatePaymentNotificationInput> = {},
): CreatePaymentNotificationInput {
  return {
    id: 'payment-notification-1',
    customerId: 'customer-1',
    paymentDate: new Date('2026-07-20T00:00:00.000Z'),
    amount: 125.5,
    currency: 'USD',
    bankReference: 'BANK-REFERENCE-1',
    receiptFileId: 'receipt-file-1',
    invoiceIds: ['invoice-1'],
    createdAt: new Date('2026-07-21T00:00:00.000Z'),
    updatedAt: new Date('2026-07-21T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PaymentNotification', () => {
  it('creates a valid payment notification', () => {
    const input = createInput();
    const entity = PaymentNotification.create(input);

    expect(entity).toMatchObject({
      id: input.id,
      customerId: input.customerId,
      amount: input.amount,
      currency: input.currency,
      bankReference: input.bankReference,
      receiptFileId: input.receiptFileId,
      invoiceIds: input.invoiceIds,
    });
    expect(entity.paymentDate).toEqual(input.paymentDate);
    expect(entity.createdAt).toEqual(input.createdAt);
    expect(entity.updatedAt).toEqual(input.updatedAt);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid amount: %s',
    (amount) => {
      expect(() => PaymentNotification.create(createInput({ amount }))).toThrow(
        'Payment notification amount must be greater than zero',
      );
    },
  );

  it('rejects an empty customerId', () => {
    expect(() =>
      PaymentNotification.create(createInput({ customerId: '   ' })),
    ).toThrow('Payment notification customerId is required');
  });

  it('rejects an empty bankReference', () => {
    expect(() =>
      PaymentNotification.create(createInput({ bankReference: '   ' })),
    ).toThrow('Payment notification bankReference is required');
  });

  it('rejects a missing paymentDate', () => {
    expect(() =>
      PaymentNotification.create(
        createInput({
          paymentDate: undefined as unknown as Date,
        }),
      ),
    ).toThrow('Payment notification paymentDate is required');
  });

  it('always starts in DRAFT status', () => {
    const entity = PaymentNotification.create(createInput());

    expect(entity.status).toBe(PaymentNotificationStatus.DRAFT);
    expect(Object.isFrozen(PaymentNotificationStatus)).toBe(true);
  });

  it('allows receiptFileId to be omitted', () => {
    const entity = PaymentNotification.create(
      createInput({ receiptFileId: undefined }),
    );

    expect(entity.receiptFileId).toBeUndefined();
  });

  it('allows invoiceIds to be empty in DRAFT', () => {
    const entity = PaymentNotification.create(createInput({ invoiceIds: [] }));

    expect(entity.status).toBe(PaymentNotificationStatus.DRAFT);
    expect(entity.invoiceIds).toEqual([]);
  });

  it('is immutable and protects mutable input values', () => {
    const invoiceIds = ['invoice-1'];
    const paymentDate = new Date('2026-07-20T00:00:00.000Z');
    const entity = PaymentNotification.create(
      createInput({ invoiceIds, paymentDate }),
    );

    invoiceIds.push('invoice-2');
    paymentDate.setUTCFullYear(2030);
    const exposedPaymentDate = entity.paymentDate;
    exposedPaymentDate.setUTCFullYear(2040);

    expect(Object.isFrozen(entity)).toBe(true);
    expect(Object.isFrozen(entity.invoiceIds)).toBe(true);
    expect(Reflect.set(entity, 'amount', 0)).toBe(false);
    expect(entity.amount).toBe(125.5);
    expect(entity.invoiceIds).toEqual(['invoice-1']);
    expect(entity.paymentDate).toEqual(new Date('2026-07-20T00:00:00.000Z'));
  });

  describe('transitionTo', () => {
    it('returns a new entity and leaves the original unchanged', () => {
      const original = PaymentNotification.create(createInput());
      const originalUpdatedAt = original.updatedAt;

      const transitioned = original.transitionTo(
        PaymentNotificationStatus.SUBMITTED,
        new Date('2026-07-22T00:00:00.000Z'),
      );

      expect(transitioned).not.toBe(original);
      expect(original.status).toBe(PaymentNotificationStatus.DRAFT);
      expect(original.updatedAt).toEqual(originalUpdatedAt);
    });

    it('applies the new status and updatedAt', () => {
      const original = PaymentNotification.create(createInput());
      const updatedAt = new Date('2026-07-22T00:00:00.000Z');

      const transitioned = original.transitionTo(
        PaymentNotificationStatus.SUBMITTED,
        updatedAt,
      );

      expect(transitioned.status).toBe(PaymentNotificationStatus.SUBMITTED);
      expect(transitioned.updatedAt).toEqual(updatedAt);
    });

    it('preserves createdAt and every other field', () => {
      const original = PaymentNotification.create(createInput());

      const transitioned = original.transitionTo(
        PaymentNotificationStatus.UNDER_REVIEW,
        new Date('2026-07-23T00:00:00.000Z'),
      );

      expect(transitioned).toMatchObject({
        id: original.id,
        customerId: original.customerId,
        amount: original.amount,
        currency: original.currency,
        bankReference: original.bankReference,
        receiptFileId: original.receiptFileId,
        invoiceIds: original.invoiceIds,
      });
      expect(transitioned.paymentDate).toEqual(original.paymentDate);
      expect(transitioned.createdAt).toEqual(original.createdAt);
    });

    it('protects updatedAt with a defensive copy', () => {
      const original = PaymentNotification.create(createInput());
      const updatedAt = new Date('2026-07-22T00:00:00.000Z');
      const expectedUpdatedAt = new Date(updatedAt.getTime());

      const transitioned = original.transitionTo(
        PaymentNotificationStatus.SUBMITTED,
        updatedAt,
      );
      updatedAt.setUTCFullYear(2030);
      const exposedUpdatedAt = transitioned.updatedAt;
      exposedUpdatedAt.setUTCFullYear(2040);

      expect(transitioned.updatedAt).toEqual(expectedUpdatedAt);
    });

    it('rejects updatedAt earlier than createdAt', () => {
      const original = PaymentNotification.create(createInput());

      expect(() =>
        original.transitionTo(
          PaymentNotificationStatus.SUBMITTED,
          new Date('2026-07-20T23:59:59.999Z'),
        ),
      ).toThrow(
        'Payment notification updatedAt cannot be earlier than createdAt',
      );
    });

    it('rejects an invalid status', () => {
      const original = PaymentNotification.create(createInput());

      expect(() =>
        original.transitionTo(
          'INVALID' as PaymentNotificationStatusType,
          new Date('2026-07-22T00:00:00.000Z'),
        ),
      ).toThrow('Payment notification status is invalid');
    });

    it('keeps invoiceIds immutable', () => {
      const original = PaymentNotification.create(createInput());

      const transitioned = original.transitionTo(
        PaymentNotificationStatus.SUBMITTED,
        new Date('2026-07-22T00:00:00.000Z'),
      );

      expect(transitioned.invoiceIds).toEqual(original.invoiceIds);
      expect(transitioned.invoiceIds).not.toBe(original.invoiceIds);
      expect(Object.isFrozen(transitioned.invoiceIds)).toBe(true);
    });

    it.each(Object.values(PaymentNotificationStatus))(
      'allows applying the valid status %s',
      (status) => {
        const original = PaymentNotification.create(createInput());

        const transitioned = original.transitionTo(
          status,
          new Date('2026-07-22T00:00:00.000Z'),
        );

        expect(transitioned.status).toBe(status);
      },
    );

    it('applies an externally authorized status without workflow validation', () => {
      const original = PaymentNotification.create(createInput());

      const transitioned = original.transitionTo(
        PaymentNotificationStatus.VALIDATED,
        new Date('2026-07-22T00:00:00.000Z'),
      );

      expect(transitioned.status).toBe(PaymentNotificationStatus.VALIDATED);
    });
  });

  describe('updateDetails', () => {
    function createDetails(
      overrides: Partial<PaymentNotificationEditableDetails> = {},
    ): PaymentNotificationEditableDetails {
      return {
        paymentDate: new Date('2026-07-24T00:00:00.000Z'),
        amount: 250.75,
        currency: 'EUR',
        bankReference: 'UPDATED-BANK-REFERENCE',
        receiptFileId: 'updated-receipt-file',
        invoiceIds: ['invoice-2', 'invoice-3'],
        ...overrides,
      };
    }

    const detailsUpdatedAt = new Date('2026-07-25T00:00:00.000Z');

    it('returns a new entity and leaves the original intact', () => {
      const original = PaymentNotification.create(createInput());
      const originalPaymentDate = original.paymentDate;
      const originalUpdatedAt = original.updatedAt;

      const updated = original.updateDetails(createDetails(), detailsUpdatedAt);

      expect(updated).not.toBe(original);
      expect(original).toMatchObject({
        amount: 125.5,
        currency: 'USD',
        bankReference: 'BANK-REFERENCE-1',
        receiptFileId: 'receipt-file-1',
        invoiceIds: ['invoice-1'],
      });
      expect(original.paymentDate).toEqual(originalPaymentDate);
      expect(original.updatedAt).toEqual(originalUpdatedAt);
    });

    it('preserves identity, status, and creation date', () => {
      const draft = PaymentNotification.create(createInput());
      const original = draft.transitionTo(
        PaymentNotificationStatus.CHANGES_REQUESTED,
        new Date('2026-07-23T00:00:00.000Z'),
      );

      const updated = original.updateDetails(createDetails(), detailsUpdatedAt);

      expect(updated.id).toBe(original.id);
      expect(updated.customerId).toBe(original.customerId);
      expect(updated.status).toBe(PaymentNotificationStatus.CHANGES_REQUESTED);
      expect(updated.createdAt).toEqual(original.createdAt);
    });

    it('updates every editable field and updatedAt', () => {
      const original = PaymentNotification.create(createInput());
      const details = createDetails();

      const updated = original.updateDetails(details, detailsUpdatedAt);

      expect(updated).toMatchObject({
        amount: details.amount,
        currency: details.currency,
        bankReference: details.bankReference,
        receiptFileId: details.receiptFileId,
        invoiceIds: details.invoiceIds,
      });
      expect(updated.paymentDate).toEqual(details.paymentDate);
      expect(updated.updatedAt).toEqual(detailsUpdatedAt);
    });

    it('protects paymentDate and updatedAt with defensive copies', () => {
      const original = PaymentNotification.create(createInput());
      const paymentDate = new Date('2026-07-24T00:00:00.000Z');
      const updatedAt = new Date('2026-07-25T00:00:00.000Z');
      const expectedPaymentDate = new Date(paymentDate.getTime());
      const expectedUpdatedAt = new Date(updatedAt.getTime());

      const updated = original.updateDetails(
        createDetails({ paymentDate }),
        updatedAt,
      );
      paymentDate.setUTCFullYear(2030);
      updatedAt.setUTCFullYear(2030);
      updated.paymentDate.setUTCFullYear(2040);
      updated.updatedAt.setUTCFullYear(2040);

      expect(updated.paymentDate).toEqual(expectedPaymentDate);
      expect(updated.updatedAt).toEqual(expectedUpdatedAt);
    });

    it('copies and freezes invoiceIds', () => {
      const original = PaymentNotification.create(createInput());
      const invoiceIds = ['invoice-2'];

      const updated = original.updateDetails(
        createDetails({ invoiceIds }),
        detailsUpdatedAt,
      );
      invoiceIds.push('invoice-3');

      expect(updated.invoiceIds).toEqual(['invoice-2']);
      expect(updated.invoiceIds).not.toBe(invoiceIds);
      expect(Object.isFrozen(updated.invoiceIds)).toBe(true);
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
      'rejects an invalid updated amount: %s',
      (amount) => {
        const original = PaymentNotification.create(createInput());

        expect(() =>
          original.updateDetails(createDetails({ amount }), detailsUpdatedAt),
        ).toThrow('Payment notification amount must be greater than zero');
      },
    );

    it('rejects an empty updated bankReference', () => {
      const original = PaymentNotification.create(createInput());

      expect(() =>
        original.updateDetails(
          createDetails({ bankReference: '   ' }),
          detailsUpdatedAt,
        ),
      ).toThrow('Payment notification bankReference is required');
    });

    it('rejects an invalid updated paymentDate', () => {
      const original = PaymentNotification.create(createInput());

      expect(() =>
        original.updateDetails(
          createDetails({ paymentDate: new Date(Number.NaN) }),
          detailsUpdatedAt,
        ),
      ).toThrow('Payment notification paymentDate is required');
    });

    it('rejects an invalid updatedAt', () => {
      const original = PaymentNotification.create(createInput());

      expect(() =>
        original.updateDetails(createDetails(), new Date(Number.NaN)),
      ).toThrow('Payment notification updatedAt is invalid');
    });

    it('rejects updatedAt earlier than createdAt', () => {
      const original = PaymentNotification.create(createInput());

      expect(() =>
        original.updateDetails(
          createDetails(),
          new Date('2026-07-20T23:59:59.999Z'),
        ),
      ).toThrow(
        'Payment notification updatedAt cannot be earlier than createdAt',
      );
    });
  });
});
