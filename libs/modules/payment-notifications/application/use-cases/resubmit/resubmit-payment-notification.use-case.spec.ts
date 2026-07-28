import {
  createStateTransition as createPlatformStateTransition,
  type ApplicationPipelineResult,
  type ProcessDecision,
  type StateTransition,
} from '@nexus/platform';
import { PaymentNotification } from '../../../domain/payment-notification.entity';
import {
  PaymentNotificationStatus,
  type CreatePaymentNotificationInput,
} from '../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import {
  PAYMENT_NOTIFICATION_ACTIONS,
  PAYMENT_NOTIFICATION_WORKFLOW,
} from '../../payment-notification-workflow';
import { ResubmitPaymentNotificationUseCase } from './resubmit-payment-notification.use-case';

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

function createSubmitted(): PaymentNotification {
  return createDraft().transitionTo(
    PaymentNotificationStatus.SUBMITTED,
    new Date('2026-07-22T00:00:00.000Z'),
  );
}

function createUnderReview(): PaymentNotification {
  return createSubmitted().transitionTo(
    PaymentNotificationStatus.UNDER_REVIEW,
    new Date('2026-07-23T00:00:00.000Z'),
  );
}

function createFromUnderReview(
  status:
    | typeof PaymentNotificationStatus.CHANGES_REQUESTED
    | typeof PaymentNotificationStatus.VALIDATED
    | typeof PaymentNotificationStatus.REJECTED,
): PaymentNotification {
  return createUnderReview().transitionTo(
    status,
    new Date('2026-07-24T00:00:00.000Z'),
  );
}

function createChangesRequested(): PaymentNotification {
  return createFromUnderReview(PaymentNotificationStatus.CHANGES_REQUESTED);
}

function createRepository(
  paymentNotification: PaymentNotification | null = createChangesRequested(),
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

function createPipelineResult(
  overrides: Partial<ProcessDecision> = {},
): ApplicationPipelineResult {
  const processDecision: ProcessDecision = {
    allowed: true,
    valid: true,
    nextState: PaymentNotificationStatus.SUBMITTED,
    requireApproval: false,
    notificationsEnabled: false,
    reason: 'Process allowed',
    ...overrides,
  };

  return {
    ...processDecision,
    processDecision,
  };
}

function createStateTransition(
  pipelineResult: ApplicationPipelineResult = createPipelineResult(),
): jest.Mocked<StateTransition<PaymentNotification>> {
  return {
    execute: jest.fn((context) => ({
      entity: context.entity,
      pipelineResult,
    })),
  };
}

describe('ResubmitPaymentNotificationUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('throws when the payment notification does not exist', async () => {
    const repository = createRepository(null);
    const stateTransition = createStateTransition();
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition,
    });

    await expect(
      useCase.execute({ id: 'missing-payment-notification' }),
    ).rejects.toThrow('Payment notification not found');
    expect(repository.findById).toHaveBeenCalledTimes(1);
    expect(stateTransition.execute).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('moves CHANGES_REQUESTED to SUBMITTED through the real transition', async () => {
    const original = createChangesRequested();
    const repository = createRepository(original);
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createPlatformStateTransition<PaymentNotification>(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: original.id });

    expect(result.pipelineResult).toMatchObject({
      allowed: true,
      valid: true,
      requireApproval: false,
      nextState: PaymentNotificationStatus.SUBMITTED,
    });
    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.SUBMITTED,
    );
    expect(repository.update).toHaveBeenCalledWith(result.paymentNotification);
  });

  it.each([
    ['DRAFT', createDraft],
    ['SUBMITTED', createSubmitted],
    ['UNDER_REVIEW', createUnderReview],
    [
      'VALIDATED',
      () => createFromUnderReview(PaymentNotificationStatus.VALIDATED),
    ],
    [
      'REJECTED',
      () => createFromUnderReview(PaymentNotificationStatus.REJECTED),
    ],
  ] as const)('does not resubmit an entity in %s', async (_status, factory) => {
    const original = factory();
    const repository = createRepository(original);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createPlatformStateTransition<PaymentNotification>(),
      clock,
    });

    const result = await useCase.execute({ id: original.id });

    expect(result.pipelineResult.allowed).toBe(false);
    expect(result.paymentNotification).toBe(original);
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns a denied pipeline result without side effects', async () => {
    const original = createChangesRequested();
    const repository = createRepository(original);
    const pipelineResult = createPipelineResult({
      allowed: false,
      nextState: null,
      reason: 'Explicit deny',
    });
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(pipelineResult),
      clock,
    });

    const result = await useCase.execute({ id: original.id });

    expect(result).toEqual({ paymentNotification: original, pipelineResult });
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns an invalid pipeline result without side effects', async () => {
    const original = createChangesRequested();
    const repository = createRepository(original);
    const pipelineResult = createPipelineResult({
      valid: false,
      nextState: null,
      reason: 'Workflow configuration invalid',
    });
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(pipelineResult),
      clock,
    });

    const result = await useCase.execute({ id: original.id });

    expect(result).toEqual({ paymentNotification: original, pipelineResult });
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects an allowed result that inconsistently requires approval', async () => {
    const repository = createRepository();
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(
        createPipelineResult({ requireApproval: true }),
      ),
      clock,
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toThrow(
      'Payment notification resubmission must not require approval',
    );
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('uses the entity status, workflow, and RESUBMIT action', async () => {
    const original = createChangesRequested();
    const repository = createRepository(original);
    const stateTransition = createStateTransition();
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await useCase.execute({ id: original.id });
    const context = stateTransition.execute.mock.calls[0][0];

    expect(context.processRequest.currentState).toBe(original.status);
    expect(context.processRequest.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.RESUBMIT,
    );
    expect(context.processRequest.workflowConfiguration.workflows[0]).toBe(
      PAYMENT_NOTIFICATION_WORKFLOW,
    );
    expect(context.processRequest.permissionRequest.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.RESUBMIT,
    );
    expect(context.processRequest.workflowEvent.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.RESUBMIT,
    );
    expect(context.processRequest.notificationEvent.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.RESUBMIT,
    );
  });

  it('finds and evaluates the transition exactly once', async () => {
    const repository = createRepository();
    const stateTransition = createStateTransition();
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition,
      clock: () => new Date(UPDATED_AT.getTime()),
    });
    const request = { id: 'payment-notification-1' };

    await useCase.execute(request);

    expect(repository.findById).toHaveBeenCalledTimes(1);
    expect(repository.findById).toHaveBeenCalledWith(request.id);
    expect(stateTransition.execute).toHaveBeenCalledTimes(1);
  });

  it('transitions and persists exactly once on success', async () => {
    const original = createChangesRequested();
    const repository = createRepository(original);
    const transitionTo = jest.spyOn(
      PaymentNotification.prototype,
      'transitionTo',
    );
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock,
    });

    const result = await useCase.execute({ id: original.id });

    expect(clock).toHaveBeenCalledTimes(1);
    expect(transitionTo).toHaveBeenCalledTimes(1);
    expect(transitionTo).toHaveBeenCalledWith(
      PaymentNotificationStatus.SUBMITTED,
      UPDATED_AT,
    );
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(result.paymentNotification);
  });

  it('changes only status and updatedAt while preserving reported data', async () => {
    const original = createChangesRequested();
    const originalUpdatedAt = original.updatedAt;
    const repository = createRepository(original);
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: original.id });

    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.SUBMITTED,
    );
    expect(result.paymentNotification.updatedAt).toEqual(UPDATED_AT);
    expect(result.paymentNotification.updatedAt).not.toEqual(originalUpdatedAt);
    expect(result.paymentNotification.createdAt).toEqual(original.createdAt);
    expect(result.paymentNotification.paymentDate).toEqual(
      original.paymentDate,
    );
    expect(result.paymentNotification.id).toBe(original.id);
    expect(result.paymentNotification.customerId).toBe(original.customerId);
    expect(result.paymentNotification.amount).toBe(original.amount);
    expect(result.paymentNotification.currency).toBe(original.currency);
    expect(result.paymentNotification.bankReference).toBe(
      original.bankReference,
    );
    expect(result.paymentNotification.receiptFileId).toBe(
      original.receiptFileId,
    );
    expect(result.paymentNotification.invoiceIds).toEqual(original.invoiceIds);
    expect(original.status).toBe(PaymentNotificationStatus.CHANGES_REQUESTED);
    expect(original.updatedAt).toEqual(originalUpdatedAt);
  });

  it('rejects an unexpected allowed nextState without side effects', async () => {
    const repository = createRepository();
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(
        createPipelineResult({
          nextState: PaymentNotificationStatus.UNDER_REVIEW,
        }),
      ),
      clock,
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toThrow(
      'Unexpected next state for payment notification resubmission',
    );
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('uses the default clock', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(UPDATED_AT);
    const repository = createRepository();
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
    });

    const result = await useCase.execute({ id: 'payment-notification-1' });

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
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });
    let returned = false;

    const execution = useCase.execute({ id: 'payment-notification-1' });
    void execution.then(() => {
      returned = true;
    });
    await Promise.resolve();

    expect(returned).toBe(false);

    finishUpdate?.();
    await execution;

    expect(returned).toBe(true);
  });

  it('propagates repository read errors without transforming them', async () => {
    const repository = createRepository();
    const repositoryError = new Error('Read failed');
    repository.findById.mockRejectedValue(repositoryError);
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toBe(repositoryError);
  });

  it('propagates repository update errors without transforming them', async () => {
    const repository = createRepository();
    const repositoryError = new Error('Update failed');
    repository.update.mockRejectedValue(repositoryError);
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toBe(repositoryError);
  });

  it('propagates domain errors without persisting', async () => {
    const repository = createRepository();
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date('2026-07-20T00:00:00.000Z'),
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toThrow(
      'Payment notification updatedAt cannot be earlier than createdAt',
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not modify its immutable request', async () => {
    const repository = createRepository();
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });
    const request = Object.freeze({ id: 'payment-notification-1' });

    await useCase.execute(request);

    expect(request).toEqual({ id: 'payment-notification-1' });
  });

  it('does not invoke unrelated repository methods', async () => {
    const repository = createRepository();
    const useCase = new ResubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await useCase.execute({ id: 'payment-notification-1' });

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.exists).not.toHaveBeenCalled();
    expect(repository.findByBankReference).not.toHaveBeenCalled();
    expect(repository.findByCustomer).not.toHaveBeenCalled();
  });
});
