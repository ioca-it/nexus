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
import type { Clock } from '../create-draft';

export interface StartReviewPaymentNotificationRequest {
  readonly id: PaymentNotificationId;
  readonly actor: AuthenticatedActor;
}

export interface StartReviewPaymentNotificationResult {
  readonly paymentNotification: PaymentNotification;
  readonly pipelineResult: ApplicationPipelineResult;
}

export interface StartReviewPaymentNotificationDependencies {
  readonly repository: PaymentNotificationRepository;
  readonly stateTransition: StateTransition<PaymentNotification>;
  readonly clock: Clock;
}

export class StartReviewPaymentNotificationUseCase {
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
    request: StartReviewPaymentNotificationRequest,
  ): Promise<StartReviewPaymentNotificationResult> {
    const paymentNotification = await this.repository.findById(request.id);

    if (!paymentNotification) {
      throw new Error('Payment notification not found');
    }

    const { pipelineResult } = this.stateTransition.execute({
      entity: paymentNotification,
      processRequest: createPaymentNotificationProcessRequest({
        actor: request.actor,
        currentState: paymentNotification.status,
        action: PAYMENT_NOTIFICATION_ACTIONS.START_REVIEW,
      }),
    });

    if (!pipelineResult.allowed || !pipelineResult.valid) {
      return {
        paymentNotification,
        pipelineResult,
      };
    }

    if (pipelineResult.nextState !== PaymentNotificationStatus.UNDER_REVIEW) {
      throw new Error('Unexpected next state for payment notification review');
    }

    const transitionedPaymentNotification = paymentNotification.transitionTo(
      PaymentNotificationStatus.UNDER_REVIEW,
      this.clock(),
    );

    await this.repository.update(transitionedPaymentNotification);

    return {
      paymentNotification: transitionedPaymentNotification,
      pipelineResult,
    };
  }
}
