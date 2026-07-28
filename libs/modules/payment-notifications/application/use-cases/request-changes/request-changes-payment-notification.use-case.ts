import type {
  ApplicationPipelineResult,
  AuthenticatedActor,
  StateTransition,
} from '@nexus/platform';
import { PaymentNotification } from '../../../domain/payment-notification.entity';
import {
  PaymentNotificationStatus,
  type PaymentNotificationId,
} from '../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import { PAYMENT_NOTIFICATION_ACTIONS } from '../../payment-notification-workflow';
import {
  createPaymentNotificationProcessRequest,
  normalizePaymentNotificationApprovalGroupIds,
} from '../../process';
import type { Clock } from '../create-draft';

export interface RequestChangesPaymentNotificationRequest {
  readonly id: PaymentNotificationId;
  readonly actor: AuthenticatedActor;
}

export interface RequestChangesPaymentNotificationResult {
  readonly paymentNotification: PaymentNotification;
  readonly pipelineResult: ApplicationPipelineResult;
}

export interface RequestChangesPaymentNotificationDependencies {
  readonly repository: PaymentNotificationRepository;
  readonly stateTransition: StateTransition<PaymentNotification>;
  readonly clock: Clock;
  readonly approvalGroupIds: readonly string[];
}

export class RequestChangesPaymentNotificationUseCase {
  private readonly repository: PaymentNotificationRepository;
  private readonly stateTransition: StateTransition<PaymentNotification>;
  private readonly clock: Clock;
  private readonly approvalGroupIds: readonly string[];

  constructor(dependencies: {
    readonly repository: PaymentNotificationRepository;
    readonly stateTransition: StateTransition<PaymentNotification>;
    readonly clock?: Clock;
    readonly approvalGroupIds: readonly string[];
  }) {
    this.repository = dependencies.repository;
    this.stateTransition = dependencies.stateTransition;
    this.clock = dependencies.clock ?? (() => new Date());
    this.approvalGroupIds = normalizePaymentNotificationApprovalGroupIds(
      dependencies.approvalGroupIds,
    );
  }

  async execute(
    request: RequestChangesPaymentNotificationRequest,
  ): Promise<RequestChangesPaymentNotificationResult> {
    const paymentNotification = await this.repository.findById(request.id);

    if (!paymentNotification) {
      throw new Error('Payment notification not found');
    }

    const { pipelineResult } = this.stateTransition.execute({
      entity: paymentNotification,
      processRequest: createPaymentNotificationProcessRequest({
        actor: request.actor,
        currentState: paymentNotification.status,
        action: PAYMENT_NOTIFICATION_ACTIONS.REQUEST_CHANGES,
        approvalGroupIds: this.approvalGroupIds,
      }),
    });

    if (!pipelineResult.allowed || !pipelineResult.valid) {
      return {
        paymentNotification,
        pipelineResult,
      };
    }

    if (!pipelineResult.requireApproval) {
      throw new Error(
        'Payment notification change request requires approval authorization',
      );
    }

    if (
      pipelineResult.nextState !== PaymentNotificationStatus.CHANGES_REQUESTED
    ) {
      throw new Error(
        'Unexpected next state for payment notification change request',
      );
    }

    const updatedAt = this.clock();
    const transitionedPaymentNotification = paymentNotification.transitionTo(
      PaymentNotificationStatus.CHANGES_REQUESTED,
      updatedAt,
    );

    await this.repository.update(transitionedPaymentNotification);

    return {
      paymentNotification: transitionedPaymentNotification,
      pipelineResult,
    };
  }
}
