import type {
  ApplicationPipelineResult,
  ProcessDecision,
  StateTransition,
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
import { SubmitPaymentNotificationUseCase } from './submit-payment-notification.use-case';

const UPDATED_AT = new Date('2026-07-24T15:30:00.000Z');

function createPaymentNotification(
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

function createRepository(
  paymentNotification: PaymentNotification | null = createPaymentNotification(),
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

describe('SubmitPaymentNotificationUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('throws when the payment notification does not exist', async () => {
    const repository = createRepository(null);
    const stateTransition = createStateTransition();
    const useCase = new SubmitPaymentNotificationUseCase({
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

  it('returns a denied result with the original entity without persisting', async () => {
    const paymentNotification = createPaymentNotification();
    const repository = createRepository(paymentNotification);
    const pipelineResult = createPipelineResult({
      allowed: false,
      nextState: null,
      reason: 'Explicit deny',
    });
    const stateTransition = createStateTransition(pipelineResult);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new SubmitPaymentNotificationUseCase({
      repository,
      stateTransition,
      clock,
    });

    const result = await useCase.execute({ id: paymentNotification.id });

    expect(result).toEqual({ paymentNotification, pipelineResult });
    expect(result.paymentNotification).toBe(paymentNotification);
    expect(repository.update).not.toHaveBeenCalled();
    expect(clock).not.toHaveBeenCalled();
  });

  it('returns an already SUBMITTED entity unchanged when submit is denied', async () => {
    const paymentNotification = createPaymentNotification().transitionTo(
      PaymentNotificationStatus.SUBMITTED,
      new Date('2026-07-22T00:00:00.000Z'),
    );
    const repository = createRepository(paymentNotification);
    const pipelineResult = createPipelineResult({
      allowed: false,
      nextState: null,
      reason: 'Transition not defined',
    });
    const stateTransition = createStateTransition(pipelineResult);
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const transitionTo = jest.spyOn(
      PaymentNotification.prototype,
      'transitionTo',
    );
    const useCase = new SubmitPaymentNotificationUseCase({
      repository,
      stateTransition,
      clock,
    });

    const result = await useCase.execute({ id: paymentNotification.id });
    const context = stateTransition.execute.mock.calls[0][0];

    expect(context.processRequest.currentState).toBe(
      PaymentNotificationStatus.SUBMITTED,
    );
    expect(clock).not.toHaveBeenCalled();
    expect(transitionTo).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    expect(result).toEqual({ paymentNotification, pipelineResult });
    expect(result.paymentNotification).toBe(paymentNotification);
  });

  it('returns an invalid result with the original entity without persisting', async () => {
    const paymentNotification = createPaymentNotification();
    const repository = createRepository(paymentNotification);
    const pipelineResult = createPipelineResult({
      allowed: true,
      valid: false,
      nextState: null,
      reason: 'Workflow configuration invalid',
    });
    const stateTransition = createStateTransition(pipelineResult);
    const useCase = new SubmitPaymentNotificationUseCase({
      repository,
      stateTransition,
    });

    const result = await useCase.execute({ id: paymentNotification.id });

    expect(result).toEqual({ paymentNotification, pipelineResult });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('submits and persists the payment notification', async () => {
    const paymentNotification = createPaymentNotification();
    const repository = createRepository(paymentNotification);
    const stateTransition = createStateTransition();
    const useCase = new SubmitPaymentNotificationUseCase({
      repository,
      stateTransition,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: paymentNotification.id });

    expect(result.paymentNotification.status).toBe(
      PaymentNotificationStatus.SUBMITTED,
    );
    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update).toHaveBeenCalledWith(result.paymentNotification);
  });

  it('uses the existing workflow and submit action in the process request', async () => {
    const paymentNotification = createPaymentNotification();
    const repository = createRepository(paymentNotification);
    const stateTransition = createStateTransition();
    const useCase = new SubmitPaymentNotificationUseCase({
      repository,
      stateTransition,
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await useCase.execute({ id: paymentNotification.id });
    const context = stateTransition.execute.mock.calls[0][0];

    expect(context.entity).toBe(paymentNotification);
    expect(context.processRequest.currentState).toBe(
      PaymentNotificationStatus.DRAFT,
    );
    expect(context.processRequest.action).toBe(
      PAYMENT_NOTIFICATION_ACTIONS.SUBMIT,
    );
    expect(context.processRequest.workflowConfiguration.workflows[0]).toBe(
      PAYMENT_NOTIFICATION_WORKFLOW,
    );
  });

  it('invokes the clock exactly once for an allowed transition', async () => {
    const repository = createRepository();
    const stateTransition = createStateTransition();
    const clock = jest.fn(() => new Date(UPDATED_AT.getTime()));
    const useCase = new SubmitPaymentNotificationUseCase({
      repository,
      stateTransition,
      clock,
    });

    await useCase.execute({ id: 'payment-notification-1' });

    expect(clock).toHaveBeenCalledTimes(1);
  });

  it('uses the default clock', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(UPDATED_AT);
    const repository = createRepository();
    const stateTransition = createStateTransition();
    const useCase = new SubmitPaymentNotificationUseCase({
      repository,
      stateTransition,
    });

    const result = await useCase.execute({ id: 'payment-notification-1' });

    expect(result.paymentNotification.updatedAt).toEqual(UPDATED_AT);
  });

  it('creates a new entity without modifying the original', async () => {
    const original = createPaymentNotification();
    const originalUpdatedAt = original.updatedAt;
    const repository = createRepository(original);
    const useCase = new SubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: original.id });

    expect(result.paymentNotification).not.toBe(original);
    expect(original.status).toBe(PaymentNotificationStatus.DRAFT);
    expect(original.updatedAt).toEqual(originalUpdatedAt);
  });

  it('preserves createdAt and paymentDate while updating updatedAt', async () => {
    const original = createPaymentNotification();
    const repository = createRepository(original);
    const useCase = new SubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    const result = await useCase.execute({ id: original.id });

    expect(result.paymentNotification.createdAt).toEqual(original.createdAt);
    expect(result.paymentNotification.paymentDate).toEqual(
      original.paymentDate,
    );
    expect(result.paymentNotification.updatedAt).toEqual(UPDATED_AT);
    expect(result.paymentNotification.updatedAt).not.toEqual(
      original.updatedAt,
    );
  });

  it('calls findById and stateTransition exactly once', async () => {
    const repository = createRepository();
    const stateTransition = createStateTransition();
    const useCase = new SubmitPaymentNotificationUseCase({
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

  it('waits for repository.update before returning', async () => {
    const repository = createRepository();
    let finishUpdate: (() => void) | undefined;
    repository.update.mockReturnValue(
      new Promise<void>((resolve) => {
        finishUpdate = resolve;
      }),
    );
    const useCase = new SubmitPaymentNotificationUseCase({
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

  it('propagates a findById repository error without transforming it', async () => {
    const repository = createRepository();
    const repositoryError = new Error('Read failed');
    repository.findById.mockRejectedValue(repositoryError);
    const useCase = new SubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toBe(repositoryError);
  });

  it('propagates an update repository error without transforming it', async () => {
    const repository = createRepository();
    const repositoryError = new Error('Update failed');
    repository.update.mockRejectedValue(repositoryError);
    const useCase = new SubmitPaymentNotificationUseCase({
      repository,
      stateTransition: createStateTransition(),
      clock: () => new Date(UPDATED_AT.getTime()),
    });

    await expect(
      useCase.execute({ id: 'payment-notification-1' }),
    ).rejects.toBe(repositoryError);
  });

  it('propagates a transitionTo domain error without persisting', async () => {
    const repository = createRepository();
    const useCase = new SubmitPaymentNotificationUseCase({
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
    const useCase = new SubmitPaymentNotificationUseCase({
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
    const useCase = new SubmitPaymentNotificationUseCase({
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
