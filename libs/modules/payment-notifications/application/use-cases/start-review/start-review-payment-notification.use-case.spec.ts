import {
  createAuthenticatedActor,
  createStateTransition as createPlatformStateTransition,
  type AuthenticatedActor,
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
import {
  StartReviewPaymentNotificationUseCase as BaseStartReviewPaymentNotificationUseCase,
  type StartReviewPaymentNotificationRequest,
} from './start-review-payment-notification.use-case';

const UPDATED_AT = new Date('2026-07-24T15:30:00.000Z');
const ACTOR = createAuthenticatedActor({
  userId: 'actor-1',
  customerId: 'administrative-customer-context',
  roles: [],
  permissions: [
    {
      module: 'payment-notifications',
      action: PAYMENT_NOTIFICATION_ACTIONS.START_REVIEW,
      effect: 'allow',
    },
  ],
  approvalGroupIds: [],
});

class StartReviewPaymentNotificationUseCase extends BaseStartReviewPaymentNotificationUseCase {
  override execute(
    request: Omit<StartReviewPaymentNotificationRequest, 'actor'> & {
      readonly actor?: AuthenticatedActor;
    },
  ) {
    return super.execute({ ...request, actor: request.actor ?? ACTOR });
  }
}

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

function createRepository(
  paymentNotification: PaymentNotification | null = createSubmitted(),
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
    nextState: PaymentNotificationStatus.UNDER_REVIEW,
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

describe('StartReviewPaymentNotificationUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('throws when the payment notification does not exist', async () => {
    const repository = createRepository(null);
    const stateTransition = createStateTransition();
    const useCase = new StartReviewPaymentNotificationUseCase({
      repository,
      stateTransition,
    });

    await expect(
      useCase.execute({ id: 'missing-payment-notification' }),
    ).rejects.toThrow('Payment notification not found');
    expect(repository.findById).toHaveBeenCalledTimes(1);
    expect(stateTransition.execute).not.toHaveBeenCalled();
  });

  it('moves a SUBMITTED entity to UNDER_REVIEW through the real state transition', async () => {
    const original = createSubmitted();
    const repository = createRepository(original);
    const useCase = new StartReviewPaymentNotificationUseCase({
      repository,
      stateTransition: createPlatformStateTransition<PaymentNotification>(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: original.id });

    expect(result.pipelineResult).toMatchObject({
      allowed: true,
      valid: true,
      nextState: PaymentNotificationStatus.UNDER_REVIEW,
    });
    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.UNDER_REVIEW,
    );
    expect(repository.update).toHaveBeenCalledTimes(1);
  });

  it('denies the real transition without an explicit actor permission', async () => {
    const original = createSubmitted();
    const repository = createRepository(original);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const actor = createAuthenticatedActor({
      userId: 'actor-without-permission',
      customerId: 'customer-1',
      roles: ['Nexus.Admin'],
      permissions: [],
      approvalGroupIds: [],
    });
    const useCase = new StartReviewPaymentNotificationUseCase({
      repository,
      stateTransition: createPlatformStateTransition<PaymentNotification>(),
      clock,
    });

    const result = await useCase.execute({ id: original.id, actor });

    expect(result.pipelineResult).toMatchObject({
      allowed: false,
      reason: 'No applicable permission',
    });
    expect(result.paymentNotification).toBe(original);
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('does not start review from DRAFT', async () => {
    const original = createDraft();
    const repository = createRepository(original);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new StartReviewPaymentNotificationUseCase({
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

  it('does not start review again from UNDER_REVIEW', async () => {
    const original = createUnderReview();
    const repository = createRepository(original);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new StartReviewPaymentNotificationUseCase({
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

  it('returns a denied pipeline result without modifying or persisting', async () => {
    const original = createSubmitted();
    const repository = createRepository(original);
    const pipelineResult = createPipelineResult({
      allowed: false,
      nextState: null,
      reason: 'Explicit deny',
    });
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new StartReviewPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(pipelineResult),
      clock,
    });

    const result = await useCase.execute({ id: original.id });

    expect(result).toEqual({ paymentNotification: original, pipelineResult });
    expect(result.paymentNotification).toBe(original);
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('returns an invalid pipeline result without modifying or persisting', async () => {
    const original = createSubmitted();
    const repository = createRepository(original);
    const pipelineResult = createPipelineResult({
      valid: false,
      nextState: null,
      reason: 'Workflow configuration invalid',
    });
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new StartReviewPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(pipelineResult),
      clock,
    });

    const result = await useCase.execute({ id: original.id });

    expect(result).toEqual({ paymentNotification: original, pipelineResult });
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('uses the entity status, existing workflow, and START_REVIEW action', async () => {
    const original = createSubmitted();
    const repository = createRepository(original);
    const stateTransition = createStateTransition();
    const useCase = new StartReviewPaymentNotificationUseCase({
      repository,
      stateTransition,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await useCase.execute({ id: original.id });
    const context = stateTransition.execute.mock.calls[0][0];

    expect(context.processRequest.currentState).toBe(original.status);
    expect(context.processRequest.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.START_REVIEW,
    );
    expect(context.processRequest.workflowConfiguration.workflows[0]).toBe(
      PAYMENT_NOTIFICATION_WORKFLOW,
    );
  });

  it('calls findById and stateTransition exactly once', async () => {
    const repository = createRepository();
    const stateTransition = createStateTransition();
    const useCase = new StartReviewPaymentNotificationUseCase({
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
    const original = createSubmitted();
    const repository = createRepository(original);
    const useCase = new StartReviewPaymentNotificationUseCase({
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
    const useCase = new StartReviewPaymentNotificationUseCase({
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
    const useCase = new StartReviewPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
    });

    const result = await useCase.execute({ id: 'payment-notification-1' });

    expect(result.paymentNotification.updatedAt).toEqual(UPDATED_AT);
  });

  it('preserves dates and the original entity while changing status and updatedAt', async () => {
    const original = createSubmitted();
    const originalUpdatedAt = original.updatedAt;
    const repository = createRepository(original);
    const useCase = new StartReviewPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: original.id });

    expect(result.paymentNotification).not.toBe(original);
    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.UNDER_REVIEW,
    );
    expect(result.paymentNotification.createdAt).toEqual(original.createdAt);
    expect(result.paymentNotification.paymentDate).toEqual(
      original.paymentDate,
    );
    expect(result.paymentNotification.updatedAt).toEqual(UPDATED_AT);
    expect(result.paymentNotification.updatedAt).not.toEqual(originalUpdatedAt);
    expect(original.status).toBe(PaymentNotificationStatus.SUBMITTED);
    expect(original.updatedAt).toEqual(originalUpdatedAt);
  });

  it('rejects an unexpected allowed nextState without side effects', async () => {
    const repository = createRepository();
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new StartReviewPaymentNotificationUseCase({
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
    ).rejects.toThrow('Unexpected next state for payment notification review');
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
    const useCase = new StartReviewPaymentNotificationUseCase({
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

  it('propagates repository errors without transforming them', async () => {
    const repository = createRepository();
    const repositoryError = new Error('Read failed');
    repository.findById.mockRejectedValue(repositoryError);
    const useCase = new StartReviewPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toBe(repositoryError);
  });

  it('propagates update errors without transforming them', async () => {
    const repository = createRepository();
    const repositoryError = new Error('Update failed');
    repository.update.mockRejectedValue(repositoryError);
    const useCase = new StartReviewPaymentNotificationUseCase({
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
    const useCase = new StartReviewPaymentNotificationUseCase({
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
    const useCase = new StartReviewPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });
    const request = Object.freeze({ id: 'payment-notification-1' });

    await useCase.execute(request);

    expect(request).toEqual({ id: 'payment-notification-1' });
  });

  it('does not invoke any other repository method', async () => {
    const repository = createRepository();
    const useCase = new StartReviewPaymentNotificationUseCase({
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
