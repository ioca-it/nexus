import { PaymentNotification } from '../../../domain/payment-notification.entity';
import {
  PaymentNotificationStatus,
  type CreatePaymentNotificationInput,
} from '../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import {
  UpdatePaymentNotificationUseCase,
  type UpdatePaymentNotificationRequest,
} from './update-payment-notification.use-case';

const UPDATED_AT = new Date('2026-07-26T15:30:00.000Z');

function createDraft(
  overrides: Partial<CreatePaymentNotificationInput> = {},
): PaymentNotification {
  return PaymentNotification.create({
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
  });
}

function createWithStatus(
  status:
    | typeof PaymentNotificationStatus.SUBMITTED
    | typeof PaymentNotificationStatus.UNDER_REVIEW
    | typeof PaymentNotificationStatus.VALIDATED
    | typeof PaymentNotificationStatus.REJECTED
    | typeof PaymentNotificationStatus.CHANGES_REQUESTED,
): PaymentNotification {
  return createDraft().transitionTo(
    status,
    new Date('2026-07-23T00:00:00.000Z'),
  );
}

function createChangesRequested(): PaymentNotification {
  return createWithStatus(PaymentNotificationStatus.CHANGES_REQUESTED);
}

function createRepository(
  paymentNotification: PaymentNotification | null = createDraft(),
): jest.Mocked<PaymentNotificationRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(paymentNotification),
    exists: jest.fn().mockResolvedValue(false),
    findByBankReference: jest.fn().mockResolvedValue([]),
    findByCustomer: jest.fn().mockResolvedValue([]),
  };
}

function createRequest(
  overrides: Partial<UpdatePaymentNotificationRequest> = {},
): UpdatePaymentNotificationRequest {
  return {
    id: 'payment-notification-1',
    paymentDate: new Date('2026-07-24T00:00:00.000Z'),
    amount: 250.75,
    currency: 'EUR',
    bankReference: 'UPDATED-BANK-REFERENCE',
    receiptFileId: 'updated-receipt-file',
    invoiceIds: ['invoice-2', 'invoice-3'],
    ...overrides,
  };
}

describe('UpdatePaymentNotificationUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('throws when the payment notification does not exist', async () => {
    const repository = createRepository(null);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock,
    });

    await expect(
      useCase.execute(createRequest({ id: 'missing-payment-notification' })),
    ).rejects.toThrow('Payment notification not found');
    expect(repository.findById).toHaveBeenCalledTimes(1);
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('updates a DRAFT payment notification without changing its status', async () => {
    const original = createDraft();
    const repository = createRepository(original);
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute(createRequest({ id: original.id }));

    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.DRAFT,
    );
    expect(repository.update).toHaveBeenCalledWith(result.paymentNotification);
  });

  it('updates CHANGES_REQUESTED without changing its status', async () => {
    const original = createChangesRequested();
    const repository = createRepository(original);
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute(createRequest({ id: original.id }));

    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.CHANGES_REQUESTED,
    );
    expect(repository.update).toHaveBeenCalledWith(result.paymentNotification);
  });

  it.each([
    PaymentNotificationStatus.SUBMITTED,
    PaymentNotificationStatus.UNDER_REVIEW,
    PaymentNotificationStatus.VALIDATED,
    PaymentNotificationStatus.REJECTED,
  ] as const)('does not allow editing in %s', async (status) => {
    const original = createWithStatus(status);
    const repository = createRepository(original);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock,
    });

    await expect(useCase.execute(createRequest())).rejects.toThrow(
      'Payment notification cannot be edited in its current status',
    );
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('finds the entity exactly once and persists exactly once on success', async () => {
    const repository = createRepository();
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date(UPDATED_AT.getTime()),
    });
    const request = createRequest();

    await useCase.execute(request);

    expect(repository.findById).toHaveBeenCalledTimes(1);
    expect(repository.findById).toHaveBeenCalledWith(request.id);
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('executes the clock and updateDetails exactly once on success', async () => {
    const original = createDraft();
    const repository = createRepository(original);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const updateDetails = jest.spyOn(
      PaymentNotification.prototype,
      'updateDetails',
    );
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock,
    });

    await useCase.execute(createRequest());

    expect(clock).toHaveBeenCalledTimes(1);
    expect(updateDetails).toHaveBeenCalledTimes(1);
  });

  it('updates every editable field and updatedAt', async () => {
    const repository = createRepository();
    const request = createRequest();
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const { paymentNotification } = await useCase.execute(request);

    expect(paymentNotification).toMatchObject({
      amount: request.amount,
      currency: request.currency,
      bankReference: request.bankReference,
      receiptFileId: request.receiptFileId,
      invoiceIds: request.invoiceIds,
    });
    expect(paymentNotification.paymentDate).toEqual(request.paymentDate);
    expect(paymentNotification.updatedAt).toEqual(UPDATED_AT);
  });

  it('preserves id, customerId, createdAt, and the original entity', async () => {
    const original = createDraft();
    const originalPaymentDate = original.paymentDate;
    const originalUpdatedAt = original.updatedAt;
    const repository = createRepository(original);
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const { paymentNotification } = await useCase.execute(createRequest());

    expect(paymentNotification).not.toBe(original);
    expect(paymentNotification.id).toBe(original.id);
    expect(paymentNotification.customerId).toBe(original.customerId);
    expect(paymentNotification.createdAt).toEqual(original.createdAt);
    expect(paymentNotification.updatedAt).not.toEqual(originalUpdatedAt);
    expect(original.paymentDate).toEqual(originalPaymentDate);
    expect(original.updatedAt).toEqual(originalUpdatedAt);
    expect(original.amount).toBe(125.5);
    expect(original.status).toBe(PaymentNotificationStatus.DRAFT);
  });

  it('allows receiptFileId to be omitted', async () => {
    const repository = createRepository();
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute(
      createRequest({ receiptFileId: undefined }),
    );

    expect(result.paymentNotification.receiptFileId).toBeUndefined();
  });

  it('allows invoiceIds to be empty', async () => {
    const repository = createRepository();
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute(createRequest({ invoiceIds: [] }));

    expect(result.paymentNotification.invoiceIds).toEqual([]);
    expect(Object.isFrozen(result.paymentNotification.invoiceIds)).toBe(true);
  });

  it('does not persist when domain validation fails', async () => {
    const repository = createRepository();
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await expect(useCase.execute(createRequest({ amount: 0 }))).rejects.toThrow(
      'Payment notification amount must be greater than zero',
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('propagates repository read errors without transforming them', async () => {
    const repository = createRepository();
    const repositoryError = new Error('Read failed');
    repository.findById.mockRejectedValue(repositoryError);
    const useCase = new UpdatePaymentNotificationUseCase({ repository });

    await expect(useCase.execute(createRequest())).rejects.toBe(
      repositoryError,
    );
  });

  it('propagates repository update errors without transforming them', async () => {
    const repository = createRepository();
    const repositoryError = new Error('Update failed');
    repository.update.mockRejectedValue(repositoryError);
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await expect(useCase.execute(createRequest())).rejects.toBe(
      repositoryError,
    );
  });

  it('propagates domain errors without transforming them', async () => {
    const repository = createRepository();
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date('2026-07-20T00:00:00.000Z'),
    });

    await expect(useCase.execute(createRequest())).rejects.toThrow(
      'Payment notification updatedAt cannot be earlier than createdAt',
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('uses the default clock', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(UPDATED_AT);
    const repository = createRepository();
    const useCase = new UpdatePaymentNotificationUseCase({ repository });

    const result = await useCase.execute(createRequest());

    expect(result.paymentNotification.updatedAt).toEqual(UPDATED_AT);
  });

  it('waits for repository.update before returning', async () => {
    const repository = createRepository();
    let finishUpdate: (() => void) | undefined;
    repository.update.mockReturnValue(
      new Promise<void>((resolve) => {
        finishUpdate = resolve;
      }),
    );
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date(UPDATED_AT.getTime()),
    });
    let returned = false;

    const execution = useCase.execute(createRequest());
    void execution.then(() => {
      returned = true;
    });
    await Promise.resolve();

    expect(returned).toBe(false);

    finishUpdate?.();
    await execution;

    expect(returned).toBe(true);
  });

  it('does not modify its input and returns an immutable result', async () => {
    const repository = createRepository();
    const request = Object.freeze({
      ...createRequest(),
      paymentDate: Object.freeze(new Date('2026-07-24T00:00:00.000Z')) as Date,
      invoiceIds: Object.freeze(['invoice-2']),
    });
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute(request);

    expect(request).toEqual({
      id: 'payment-notification-1',
      paymentDate: new Date('2026-07-24T00:00:00.000Z'),
      amount: 250.75,
      currency: 'EUR',
      bankReference: 'UPDATED-BANK-REFERENCE',
      receiptFileId: 'updated-receipt-file',
      invoiceIds: ['invoice-2'],
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('does not invoke transitionTo or unrelated repository methods', async () => {
    const original = createDraft();
    const repository = createRepository(original);
    const transitionTo = jest.spyOn(
      PaymentNotification.prototype,
      'transitionTo',
    );
    const useCase = new UpdatePaymentNotificationUseCase({
      repository,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await useCase.execute(createRequest());

    expect(transitionTo).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.exists).not.toHaveBeenCalled();
    expect(repository.findByBankReference).not.toHaveBeenCalled();
    expect(repository.findByCustomer).not.toHaveBeenCalled();
  });
});
