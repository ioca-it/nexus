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
import { createPaymentNotificationProcessRequest } from '../../process';
import { evaluatePaymentNotificationAccess } from '../../security';
import type { Clock } from '../create-draft';

export interface ResubmitPaymentNotificationRequest {
  readonly id: PaymentNotificationId;
  readonly actor: AuthenticatedActor;
}

export interface ResubmitPaymentNotificationResult {
  readonly paymentNotification: PaymentNotification;
  readonly pipelineResult: ApplicationPipelineResult;
}

export interface ResubmitPaymentNotificationDependencies {
  readonly repository: PaymentNotificationRepository;
  readonly stateTransition: StateTransition<PaymentNotification>;
  readonly clock: Clock;
}

export class ResubmitPaymentNotificationUseCase {
  private readonly repository: PaymentNotificationRepository;
  private readonly stateTransition: StateTransition<PaymentNotification>;
  private readonly clock: Clock;

  constructor(dependencies: {
    readonly repository: PaymentNotificationRepository;
    readonly stateTransition: StateTransition<PaymentNotification>;
    readonly clock?: Clock;
  }) {
    this.repository = dependencies.repository;
    this.stateTransition = dependencies.stateTransition;
    this.clock = dependencies.clock ?? (() => new Date());
  }

  async execute(
    request: ResubmitPaymentNotificationRequest,
  ): Promise<ResubmitPaymentNotificationResult> {
    const paymentNotification = await this.repository.findById(request.id);

    if (!paymentNotification) {
      throw new Error('Payment notification not found');
    }

    const accessDecision = evaluatePaymentNotificationAccess({
      actor: request.actor,
      action: PAYMENT_NOTIFICATION_ACTIONS.RESUBMIT,
      resourceCustomerId: paymentNotification.customerId,
    });

    if (!accessDecision.allowed) {
      throw new Error('Payment notification access denied');
    }

    const { pipelineResult } = this.stateTransition.execute({
      entity: paymentNotification,
      processRequest: createPaymentNotificationProcessRequest({
        actor: request.actor,
        currentState: paymentNotification.status,
        action: PAYMENT_NOTIFICATION_ACTIONS.RESUBMIT,
      }),
    });

    if (!pipelineResult.allowed || !pipelineResult.valid) {
      return {
        paymentNotification,
        pipelineResult,
      };
    }

    if (pipelineResult.requireApproval) {
      throw new Error(
        'Payment notification resubmission must not require approval',
      );
    }

    if (pipelineResult.nextState !== PaymentNotificationStatus.SUBMITTED) {
      throw new Error(
        'Unexpected next state for payment notification resubmission',
      );
    }

    const updatedAt = this.clock();
    const transitionedPaymentNotification = paymentNotification.transitionTo(
      PaymentNotificationStatus.SUBMITTED,
      updatedAt,
    );

    await this.repository.update(transitionedPaymentNotification);

    return {
      paymentNotification: transitionedPaymentNotification,
      pipelineResult,
    };
  }
}
