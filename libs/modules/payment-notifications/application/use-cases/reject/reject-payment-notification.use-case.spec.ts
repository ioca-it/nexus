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
import { RejectPaymentNotificationUseCase } from './reject-payment-notification.use-case';

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

function createRejected(): PaymentNotification {
  return createUnderReview().transitionTo(
    PaymentNotificationStatus.REJECTED,
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
    nextState: PaymentNotificationStatus.REJECTED,
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

describe('RejectPaymentNotificationUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('throws when the payment notification does not exist', async () => {
    const repository = createRepository(null);
    const stateTransition = createStateTransition();
    const useCase = new RejectPaymentNotificationUseCase({
      repository,
      stateTransition,
    });

    await expect(
      useCase.execute({ id: 'missing-payment-notification' }),
    ).rejects.toThrow('Payment notification not found');
    expect(stateTransition.execute).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('denies the real approval transition until actor context is integrated', async () => {
    const original = createUnderReview();
    const repository = createRepository(original);
    const useCase = new RejectPaymentNotificationUseCase({
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
    ['REJECTED', createRejected],
  ] as const)('does not reject an entity in %s', async (_status, factory) => {
    const original = factory();
    const repository = createRepository(original);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new RejectPaymentNotificationUseCase({
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

  it.each([
    [
      'denied',
      createPipelineResult({
        allowed: false,
        nextState: null,
        requireApproval: false,
        reason: 'Explicit deny',
      }),
    ],
    [
      'invalid',
      createPipelineResult({
        valid: false,
        nextState: null,
        reason: 'Workflow configuration invalid',
      }),
    ],
  ])(
    'returns an %s result without modifying or persisting',
    async (_, pipelineResult) => {
      const original = createUnderReview();
      const repository = createRepository(original);
      const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
      const useCase = new RejectPaymentNotificationUseCase({
        repository,
        stateTransition: createStateTransition(pipelineResult),
        clock,
      });

      const result = await useCase.execute({ id: original.id });

      expect(result).toEqual({ paymentNotification: original, pipelineResult });
      expect(clock).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    },
  );

  it('requires approval authorization for an allowed result', async () => {
    const repository = createRepository();
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new RejectPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(
        createPipelineResult({ requireApproval: false }),
      ),
      clock,
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toThrow(
      'Payment notification rejection requires approval authorization',
    );
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('uses the entity status, existing workflow, and REJECT action', async () => {
    const original = createUnderReview();
    const repository = createRepository(original);
    const stateTransition = createStateTransition();
    const useCase = new RejectPaymentNotificationUseCase({
      repository,
      stateTransition,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await useCase.execute({ id: original.id });
    const context = stateTransition.execute.mock.calls[0][0];

    expect(context.processRequest.currentState).toBe(
      PaymentNotificationStatus.UNDER_REVIEW,
    );
    expect(context.processRequest.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.REJECT,
    );
    expect(context.processRequest.workflowConfiguration.workflows[0]).toBe(
      PAYMENT_NOTIFICATION_WORKFLOW,
    );
    expect(context.processRequest.permissionRequest.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.REJECT,
    );
    expect(context.processRequest.workflowEvent.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.REJECT,
    );
    expect(context.processRequest.notificationEvent.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.REJECT,
    );
  });

  it('transitions to REJECTED once, persists once, and preserves the original', async () => {
    const original = createUnderReview();
    const originalUpdatedAt = original.updatedAt;
    const repository = createRepository(original);
    const transitionTo = jest.spyOn(
      PaymentNotification.prototype,
      'transitionTo',
    );
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new RejectPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock,
    });

    const result = await useCase.execute({ id: original.id });

    expect(clock).toHaveBeenCalledTimes(1);
    expect(transitionTo).toHaveBeenCalledTimes(1);
    expect(transitionTo).toHaveBeenCalledWith(
      PaymentNotificationStatus.REJECTED,
      UPDATED_AT,
    );
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(result.paymentNotification);
    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.REJECTED,
    );
    expect(result.paymentNotification.updatedAt).toEqual(UPDATED_AT);
    expect(result.paymentNotification.createdAt).toEqual(original.createdAt);
    expect(result.paymentNotification.paymentDate).toEqual(
      original.paymentDate,
    );
    expect(original.status).toBe(PaymentNotificationStatus.UNDER_REVIEW);
    expect(original.updatedAt).toEqual(originalUpdatedAt);
  });

  it('rejects an unexpected allowed nextState without side effects', async () => {
    const repository = createRepository();
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new RejectPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(
        createPipelineResult({
          nextState: PaymentNotificationStatus.VALIDATED,
        }),
      ),
      clock,
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toThrow(
      'Unexpected next state for payment notification rejection',
    );
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('uses the default clock', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(UPDATED_AT);
    const repository = createRepository();
    const useCase = new RejectPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
    });

    const result = await useCase.execute({ id: 'payment-notification-1' });

    expect(result.paymentNotification.updatedAt).toEqual(UPDATED_AT);
  });

  it('propagates repository errors without transforming them', async () => {
    const readRepository = createRepository();
    const readError = new Error('Read failed');
    readRepository.findById.mockRejectedValue(readError);
    const readUseCase = new RejectPaymentNotificationUseCase({
      repository: readRepository,
      stateTransition: createStateTransition(),
    });

    await expect(
      readUseCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toBe(readError);

    const updateRepository = createRepository();
    const updateError = new Error('Update failed');
    updateRepository.update.mockRejectedValue(updateError);
    const updateUseCase = new RejectPaymentNotificationUseCase({
      repository: updateRepository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await expect(
      updateUseCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toBe(updateError);
  });

  it('waits for repository.update before returning', async () => {
    const repository = createRepository();
    let finishUpdate: (() => void) | undefined;
    repository.update.mockReturnValue(
      new Promise<void>((resolve) => {
        finishUpdate = resolve;
      }),
    );
    const useCase = new RejectPaymentNotificationUseCase({
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

  it('does not modify the request or invoke unrelated repository methods', async () => {
    const repository = createRepository();
    const useCase = new RejectPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });
    const request = Object.freeze({ id: 'payment-notification-1' });

    await useCase.execute(request);

    expect(request).toEqual({ id: 'payment-notification-1' });
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.exists).not.toHaveBeenCalled();
    expect(repository.findByBankReference).not.toHaveBeenCalled();
    expect(repository.findByCustomer).not.toHaveBeenCalled();
  });
});
