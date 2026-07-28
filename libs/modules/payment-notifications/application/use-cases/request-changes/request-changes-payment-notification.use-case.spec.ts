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
  RequestChangesPaymentNotificationUseCase as BaseRequestChangesPaymentNotificationUseCase,
  type RequestChangesPaymentNotificationRequest,
} from './request-changes-payment-notification.use-case';

const UPDATED_AT = new Date('2026-07-25T15:30:00.000Z');
const APPROVAL_GROUP_IDS = Object.freeze(['CHANGE-REQUESTERS']);
const ACTOR = createAuthenticatedActor({
  userId: 'actor-1',
  customerId: 'administrative-customer-context',
  roles: [],
  permissions: [
    {
      module: 'payment-notifications',
      action: PAYMENT_NOTIFICATION_ACTIONS.REQUEST_CHANGES,
      effect: 'allow',
    },
  ],
  approvalGroupIds: APPROVAL_GROUP_IDS,
});

type RequestChangesDependencies = ConstructorParameters<
  typeof BaseRequestChangesPaymentNotificationUseCase
>[0];

class RequestChangesPaymentNotificationUseCase extends BaseRequestChangesPaymentNotificationUseCase {
  constructor(
    dependencies: Omit<RequestChangesDependencies, 'approvalGroupIds'> & {
      readonly approvalGroupIds?: readonly string[];
    },
  ) {
    super({
      ...dependencies,
      approvalGroupIds: dependencies.approvalGroupIds ?? APPROVAL_GROUP_IDS,
    });
  }

  override execute(
    request: Omit<RequestChangesPaymentNotificationRequest, 'actor'> & {
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

function createWithStatus(
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
    nextState: PaymentNotificationStatus.CHANGES_REQUESTED,
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

describe('RequestChangesPaymentNotificationUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('throws when the payment notification does not exist', async () => {
    const repository = createRepository(null);
    const stateTransition = createStateTransition();
    const useCase = new RequestChangesPaymentNotificationUseCase({
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

  it('authorizes the real approval transition with actor permission and group', async () => {
    const original = createUnderReview();
    const repository = createRepository(original);
    const useCase = new RequestChangesPaymentNotificationUseCase({
      repository,
      stateTransition: createPlatformStateTransition<PaymentNotification>(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: original.id });

    expect(result.pipelineResult).toMatchObject({
      allowed: true,
      valid: true,
      requireApproval: true,
      nextState: PaymentNotificationStatus.CHANGES_REQUESTED,
      reason: 'Process allowed',
    });
    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.CHANGES_REQUESTED,
    );
    expect(repository.update).toHaveBeenCalledWith(result.paymentNotification);
  });

  it('denies the real transition when the actor is outside the configured groups', async () => {
    const original = createUnderReview();
    const repository = createRepository(original);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const actor = createAuthenticatedActor({
      userId: 'actor-outside-group',
      customerId: 'customer-1',
      roles: ['Nexus.Admin'],
      permissions: [
        {
          module: 'payment-notifications',
          action: PAYMENT_NOTIFICATION_ACTIONS.REQUEST_CHANGES,
          effect: 'allow',
        },
      ],
      approvalGroupIds: ['OTHER-GROUP'],
    });
    const useCase = new RequestChangesPaymentNotificationUseCase({
      repository,
      stateTransition: createPlatformStateTransition<PaymentNotification>(),
      clock,
    });

    const result = await useCase.execute({ id: original.id, actor });

    expect(result.pipelineResult).toMatchObject({
      allowed: false,
      reason: 'Actor is not a member of a required approval group',
    });
    expect(result.paymentNotification).toBe(original);
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects an empty approval-group configuration at construction', () => {
    expect(
      () =>
        new BaseRequestChangesPaymentNotificationUseCase({
          repository: createRepository(),
          stateTransition:
            createPlatformStateTransition<PaymentNotification>(),
          approvalGroupIds: [],
        }),
    ).toThrow('At least one approval group ID is required');
  });

  it.each([
    ['DRAFT', createDraft],
    ['SUBMITTED', createSubmitted],
    [
      'CHANGES_REQUESTED',
      () => createWithStatus(PaymentNotificationStatus.CHANGES_REQUESTED),
    ],
    ['VALIDATED', () => createWithStatus(PaymentNotificationStatus.VALIDATED)],
    ['REJECTED', () => createWithStatus(PaymentNotificationStatus.REJECTED)],
  ] as const)(
    'does not request changes for an entity in %s',
    async (_status, factory) => {
      const original = factory();
      const repository = createRepository(original);
      const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
      const useCase = new RequestChangesPaymentNotificationUseCase({
        repository,
        stateTransition: createPlatformStateTransition<PaymentNotification>(),
        clock,
      });

      const result = await useCase.execute({ id: original.id });

      expect(result.pipelineResult.allowed).toBe(false);
      expect(result.paymentNotification).toBe(original);
      expect(clock).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    },
  );

  it('returns a denied pipeline result without side effects', async () => {
    const original = createUnderReview();
    const repository = createRepository(original);
    const pipelineResult = createPipelineResult({
      allowed: false,
      nextState: null,
      requireApproval: false,
      reason: 'Explicit deny',
    });
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new RequestChangesPaymentNotificationUseCase({
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
    const original = createUnderReview();
    const repository = createRepository(original);
    const pipelineResult = createPipelineResult({
      valid: false,
      nextState: null,
      reason: 'Workflow configuration invalid',
    });
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new RequestChangesPaymentNotificationUseCase({
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
    const useCase = new RequestChangesPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(
        createPipelineResult({ requireApproval: false }),
      ),
      clock,
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toThrow(
      'Payment notification change request requires approval authorization',
    );
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('uses the entity status, workflow, and REQUEST_CHANGES action', async () => {
    const original = createUnderReview();
    const repository = createRepository(original);
    const stateTransition = createStateTransition();
    const useCase = new RequestChangesPaymentNotificationUseCase({
      repository,
      stateTransition,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await useCase.execute({ id: original.id });
    const context = stateTransition.execute.mock.calls[0][0];

    expect(context.processRequest.currentState).toBe(original.status);
    expect(context.processRequest.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.REQUEST_CHANGES,
    );
    expect(context.processRequest.workflowConfiguration.workflows[0]).toBe(
      PAYMENT_NOTIFICATION_WORKFLOW,
    );
    expect(context.processRequest.permissionRequest.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.REQUEST_CHANGES,
    );
    expect(context.processRequest.workflowEvent.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.REQUEST_CHANGES,
    );
    expect(context.processRequest.notificationEvent.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.REQUEST_CHANGES,
    );
  });

  it('finds and evaluates the transition exactly once', async () => {
    const repository = createRepository();
    const stateTransition = createStateTransition();
    const useCase = new RequestChangesPaymentNotificationUseCase({
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
    const original = createUnderReview();
    const repository = createRepository(original);
    const transitionTo = jest.spyOn(
      PaymentNotification.prototype,
      'transitionTo',
    );
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new RequestChangesPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock,
    });

    const result = await useCase.execute({ id: original.id });

    expect(clock).toHaveBeenCalledTimes(1);
    expect(transitionTo).toHaveBeenCalledTimes(1);
    expect(transitionTo).toHaveBeenCalledWith(
      PaymentNotificationStatus.CHANGES_REQUESTED,
      UPDATED_AT,
    );
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(result.paymentNotification);
  });

  it('changes only status and updatedAt while preserving the original', async () => {
    const original = createUnderReview();
    const originalUpdatedAt = original.updatedAt;
    const repository = createRepository(original);
    const useCase = new RequestChangesPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: original.id });

    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.CHANGES_REQUESTED,
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
    expect(original.status).toBe(PaymentNotificationStatus.UNDER_REVIEW);
    expect(original.updatedAt).toEqual(originalUpdatedAt);
  });

  it('rejects an unexpected allowed nextState without side effects', async () => {
    const repository = createRepository();
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new RequestChangesPaymentNotificationUseCase({
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
      'Unexpected next state for payment notification change request',
    );
    expect(clock).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('uses the default clock', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(UPDATED_AT);
    const repository = createRepository();
    const useCase = new RequestChangesPaymentNotificationUseCase({
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
    const useCase = new RequestChangesPaymentNotificationUseCase({
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
    const useCase = new RequestChangesPaymentNotificationUseCase({
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
    const useCase = new RequestChangesPaymentNotificationUseCase({
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
    const useCase = new RequestChangesPaymentNotificationUseCase({
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
    const useCase = new RequestChangesPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });
    const request = Object.freeze({ id: 'payment-notification-1' });

    await useCase.execute(request);

    expect(request).toEqual({ id: 'payment-notification-1' });
  });

  it('does not invoke unrelated repository methods or create approval state', async () => {
    const repository = createRepository();
    const useCase = new RequestChangesPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: 'payment-notification-1' });

    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.CHANGES_REQUESTED,
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.exists).not.toHaveBeenCalled();
    expect(repository.findByBankReference).not.toHaveBeenCalled();
    expect(repository.findByCustomer).not.toHaveBeenCalled();
  });
});
