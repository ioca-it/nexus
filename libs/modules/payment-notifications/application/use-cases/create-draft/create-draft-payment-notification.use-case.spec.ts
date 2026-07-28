import { PaymentNotification } from '../../../domain/payment-notification.entity';
import { PaymentNotificationStatus } from '../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import {
  CreateDraftPaymentNotificationUseCase,
  type Clock,
  type CreateDraftPaymentNotificationRequest,
} from './create-draft-payment-notification.use-case';

const CREATED_AT = new Date('2026-07-24T15:30:00.000Z');

function createRequest(
  overrides: Partial<CreateDraftPaymentNotificationRequest> = {},
): CreateDraftPaymentNotificationRequest {
  return {
    id: 'payment-notification-1',
    customerId: 'customer-1',
    paymentDate: new Date('2026-07-20T00:00:00.000Z'),
    amount: 125.5,
    currency: 'USD',
    bankReference: 'BANK-REFERENCE-1',
    receiptFileId: 'receipt-file-1',
    invoiceIds: ['invoice-1'],
    ...overrides,
  };
}

function createRepository(): jest.Mocked<PaymentNotificationRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    exists: jest.fn().mockResolvedValue(false),
    findByBankReference: jest.fn().mockResolvedValue([]),
    findByCustomer: jest.fn().mockResolvedValue([]),
  };
}

function createUseCase(
  repository: PaymentNotificationRepository,
  clock: Clock = () => new Date(CREATED_AT.getTime()),
) {
  return new CreateDraftPaymentNotificationUseCase({ repository, clock });
}

describe('CreateDraftPaymentNotificationUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('creates and persists a draft payment notification', async () => {
    const repository = createRepository();
    const create = jest.spyOn(PaymentNotification, 'create');

    const result = await createUseCase(repository).execute(createRequest());

    expect(create).toHaveBeenCalledTimes(1);
    expect(result.paymentNotification).toBeInstanceOf(PaymentNotification);
    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.DRAFT,
    );
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('returns the same entity passed to repository.create', async () => {
    const repository = createRepository();

    const result = await createUseCase(repository).execute(createRequest());

    expect(repository.create).toHaveBeenCalledWith(result.paymentNotification);
    expect(repository.create.mock.calls[0][0]).toBe(result.paymentNotification);
  });

  it('waits for repository.create before returning the result', async () => {
    const repository = createRepository();
    let finishPersistence: (() => void) | undefined;
    const persistence = new Promise<void>((resolve) => {
      finishPersistence = resolve;
    });
    repository.create.mockReturnValue(persistence);
    let returned = false;

    const execution = createUseCase(repository).execute(createRequest());
    void execution.then(() => {
      returned = true;
    });
    await Promise.resolve();

    expect(returned).toBe(false);

    finishPersistence?.();
    const result = await execution;

    expect(returned).toBe(true);
    expect(result.paymentNotification).toBe(repository.create.mock.calls[0][0]);
  });

  it('propagates a repository.create error without returning success', async () => {
    const repository = createRepository();
    const repositoryError = new Error('Persistence failed');
    repository.create.mockRejectedValue(repositoryError);

    const execution = createUseCase(repository).execute(createRequest());

    await expect(execution).rejects.toBe(repositoryError);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('invokes the clock exactly once', async () => {
    const repository = createRepository();
    const clock = jest.fn(() => new Date(CREATED_AT.getTime()));

    await createUseCase(repository, clock).execute(createRequest());

    expect(clock).toHaveBeenCalledTimes(1);
  });

  it('uses an injected clock', async () => {
    const repository = createRepository();

    const { paymentNotification } =
      await createUseCase(repository).execute(createRequest());

    expect(paymentNotification.createdAt).toEqual(CREATED_AT);
  });

  it('uses the default clock', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(CREATED_AT);
    const repository = createRepository();
    const useCase = new CreateDraftPaymentNotificationUseCase({ repository });

    const { paymentNotification } = await useCase.execute(createRequest());

    expect(paymentNotification.createdAt).toEqual(CREATED_AT);
    expect(paymentNotification.updatedAt).toEqual(CREATED_AT);
  });

  it('keeps paymentDate separate from createdAt', async () => {
    const repository = createRepository();
    const request = createRequest({
      paymentDate: new Date('2026-06-10T08:00:00.000Z'),
    });

    const { paymentNotification } =
      await createUseCase(repository).execute(request);

    expect(paymentNotification.paymentDate).toEqual(request.paymentDate);
    expect(paymentNotification.createdAt).toEqual(CREATED_AT);
    expect(paymentNotification.paymentDate).not.toEqual(
      paymentNotification.createdAt,
    );
  });

  it('sets updatedAt equal to createdAt', async () => {
    const repository = createRepository();

    const { paymentNotification } =
      await createUseCase(repository).execute(createRequest());

    expect(paymentNotification.updatedAt).toEqual(
      paymentNotification.createdAt,
    );
  });

  it('keeps defensive copies of the clock date', async () => {
    const repository = createRepository();
    const clockDate = new Date(CREATED_AT.getTime());
    const create = jest.spyOn(PaymentNotification, 'create');

    const { paymentNotification } = await createUseCase(
      repository,
      () => clockDate,
    ).execute(createRequest());
    const createInput = create.mock.calls[0][0];

    expect(createInput.createdAt).not.toBe(clockDate);
    expect(createInput.updatedAt).not.toBe(clockDate);
    expect(createInput.updatedAt).not.toBe(createInput.createdAt);

    clockDate.setUTCFullYear(2030);

    expect(paymentNotification.createdAt).toEqual(CREATED_AT);
    expect(paymentNotification.updatedAt).toEqual(CREATED_AT);
  });

  it('allows receiptFileId to be omitted', async () => {
    const repository = createRepository();

    const { paymentNotification } = await createUseCase(repository).execute(
      createRequest({ receiptFileId: undefined }),
    );

    expect(paymentNotification.receiptFileId).toBeUndefined();
  });

  it('allows invoiceIds to be empty', async () => {
    const repository = createRepository();

    const { paymentNotification } = await createUseCase(repository).execute(
      createRequest({ invoiceIds: [] }),
    );

    expect(paymentNotification.invoiceIds).toEqual([]);
  });

  it.each([
    [{ amount: 0 }, 'Payment notification amount must be greater than zero'],
    [{ customerId: '   ' }, 'Payment notification customerId is required'],
    [
      { bankReference: '   ' },
      'Payment notification bankReference is required',
    ],
    [
      { paymentDate: new Date('invalid') },
      'Payment notification paymentDate is required',
    ],
  ] satisfies readonly [
    Partial<CreateDraftPaymentNotificationRequest>,
    string,
  ][])(
    'propagates the domain error for invalid input %# without persisting',
    async (overrides, expectedError) => {
      const repository = createRepository();

      await expect(
        createUseCase(repository).execute(createRequest(overrides)),
      ).rejects.toThrow(expectedError);
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  it('does not modify its inputs', async () => {
    const repository = createRepository();
    const source = createRequest();
    const request: CreateDraftPaymentNotificationRequest = Object.freeze({
      ...source,
      paymentDate: Object.freeze(
        new Date(source.paymentDate.getTime()),
      ) as Date,
      invoiceIds: Object.freeze([...source.invoiceIds]),
    });
    const originalPaymentDate = request.paymentDate.getTime();
    const originalInvoiceIds = [...request.invoiceIds];

    await createUseCase(repository).execute(request);

    expect(request.paymentDate.getTime()).toBe(originalPaymentDate);
    expect(request.invoiceIds).toEqual(originalInvoiceIds);
  });

  it('does not invoke any other repository method', async () => {
    const repository = createRepository();

    await createUseCase(repository).execute(createRequest());

    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.exists).not.toHaveBeenCalled();
    expect(repository.findByBankReference).not.toHaveBeenCalled();
    expect(repository.findByCustomer).not.toHaveBeenCalled();
  });
});
