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
import { ValidatePaymentNotificationUseCase } from './validate-payment-notification.use-case';

const UPDATED_AT = new Date('2026-07-25T15:30:00.000Z');

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

function createValidated(): PaymentNotification {
  return createUnderReview().transitionTo(
    PaymentNotificationStatus.VALIDATED,
    new Date('2026-07-24T00:00:00.000Z'),
  );
}

function createRepository(
  paymentNotification: PaymentNotification | null = createUnderReview(),
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
    nextState: PaymentNotificationStatus.VALIDATED,
    requireApproval: true,
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

describe('ValidatePaymentNotificationUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('throws when the payment notification does not exist', async () => {
    const repository = createRepository(null);
    const stateTransition = createStateTransition();
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition,
    });

    await expect(
      useCase.execute({ id: 'missing-payment-notification' }),
    ).rejects.toThrow('Payment notification not found');
    expect(repository.findById).toHaveBeenCalledTimes(1);
    expect(stateTransition.execute).not.toHaveBeenCalled();
  });

  it('denies the real approval transition until actor context is integrated', async () => {
    const original = createUnderReview();
    const repository = createRepository(original);
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition: createPlatformStateTransition<PaymentNotification>(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: original.id });

    expect(result.pipelineResult).toMatchObject({
      allowed: false,
      valid: true,
      requireApproval: true,
      nextState: null,
      reason: 'Actor context is required for approval',
    });
    expect(result.paymentNotification).toBe(original);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it.each([
    ['DRAFT', createDraft],
    ['SUBMITTED', createSubmitted],
    ['VALIDATED', createValidated],
  ] as const)('does not validate an entity in %s', async (_status, factory) => {
    const original = factory();
    const repository = createRepository(original);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new ValidatePaymentNotificationUseCase({
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

  it('returns a denied result without modifying or persisting', async () => {
    const original = createUnderReview();
    const repository = createRepository(original);
    const pipelineResult = createPipelineResult({
      allowed: false,
      nextState: null,
      requireApproval: false,
      reason: 'Explicit deny',
    });
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(pipelineResult),
      clock,
    });

    const result = await useCase.execute({ id: original.id });

    expect(result).toEqual({ paymentNotification: original, pipelineResult });
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns an invalid result without modifying or persisting', async () => {
    const original = createUnderReview();
    const repository = createRepository(original);
    const pipelineResult = createPipelineResult({
      valid: false,
      nextState: null,
      reason: 'Workflow configuration invalid',
    });
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(pipelineResult),
      clock,
    });

    const result = await useCase.execute({ id: original.id });

    expect(result).toEqual({ paymentNotification: original, pipelineResult });
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects an allowed result without required approval authorization', async () => {
    const repository = createRepository();
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(
        createPipelineResult({ requireApproval: false }),
      ),
      clock,
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toThrow(
      'Payment notification validation requires approval authorization',
    );
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('uses the entity status, existing workflow, and VALIDATE action', async () => {
    const original = createUnderReview();
    const repository = createRepository(original);
    const stateTransition = createStateTransition();
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await useCase.execute({ id: original.id });
    const context = stateTransition.execute.mock.calls[0][0];

    expect(context.processRequest.currentState).toBe(original.status);
    expect(context.processRequest.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.VALIDATE,
    );
    expect(context.processRequest.workflowConfiguration.workflows[0]).toBe(
      PAYMENT_NOTIFICATION_WORKFLOW,
    );
  });

  it('calls findById and stateTransition exactly once', async () => {
    const repository = createRepository();
    const stateTransition = createStateTransition();
    const useCase = new ValidatePaymentNotificationUseCase({
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

  it('updates exactly once with the new entity on success', async () => {
    const original = createUnderReview();
    const repository = createRepository(original);
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: original.id });

    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(result.paymentNotification);
    expect(result.paymentNotification).not.toBe(original);
  });

  it('invokes the clock exactly once on success', async () => {
    const repository = createRepository();
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock,
    });

    await useCase.execute({ id: 'payment-notification-1' });

    expect(clock).toHaveBeenCalledTimes(1);
  });

  it('uses the default clock', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(UPDATED_AT);
    const repository = createRepository();
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
    });

    const result = await useCase.execute({ id: 'payment-notification-1' });

    expect(result.paymentNotification.updatedAt).toEqual(UPDATED_AT);
  });

  it('preserves dates and the original while changing only status and updatedAt', async () => {
    const original = createUnderReview();
    const originalUpdatedAt = original.updatedAt;
    const repository = createRepository(original);
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: original.id });

    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.VALIDATED,
    );
    expect(result.paymentNotification.createdAt).toEqual(original.createdAt);
    expect(result.paymentNotification.paymentDate).toEqual(
      original.paymentDate,
    );
    expect(result.paymentNotification.updatedAt).toEqual(UPDATED_AT);
    expect(result.paymentNotification.updatedAt).not.toEqual(originalUpdatedAt);
    expect(original.status).toBe(PaymentNotificationStatus.UNDER_REVIEW);
    expect(original.updatedAt).toEqual(originalUpdatedAt);
  });

  it('rejects an unexpected allowed nextState without side effects', async () => {
    const repository = createRepository();
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(
        createPipelineResult({
          nextState: PaymentNotificationStatus.REJECTED,
        }),
      ),
      clock,
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toThrow(
      'Unexpected next state for payment notification validation',
    );
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('waits for repository.update before returning', async () => {
    const repository = createRepository();
    let finishUpdate: (() => void) | undefined;
    repository.update.mockReturnValue(
      new Promise<void>((resolve) => {
        finishUpdate = resolve;
      }),
    );
    const useCase = new ValidatePaymentNotificationUseCase({
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
    const useCase = new ValidatePaymentNotificationUseCase({
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
    const useCase = new ValidatePaymentNotificationUseCase({
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
    const useCase = new ValidatePaymentNotificationUseCase({
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

  it('does not modify its request', async () => {
    const repository = createRepository();
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });
    const request = Object.freeze({ id: 'payment-notification-1' });

    await useCase.execute(request);

    expect(request).toEqual({ id: 'payment-notification-1' });
  });

  it('does not invoke other repository methods or create an approval process', async () => {
    const repository = createRepository();
    const transitionTo = jest.spyOn(
      PaymentNotification.prototype,
      'transitionTo',
    );
    const useCase = new ValidatePaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: 'payment-notification-1' });

    expect(transitionTo).toHaveBeenCalledTimes(1);
    expect(transitionTo).toHaveBeenCalledWith(
      PaymentNotificationStatus.VALIDATED,
      UPDATED_AT,
    );
    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.VALIDATED,
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.exists).not.toHaveBeenCalled();
    expect(repository.findByBankReference).not.toHaveBeenCalled();
    expect(repository.findByCustomer).not.toHaveBeenCalled();
  });
});
