import type {
  ApplicationPipelineResult,
  ProcessRequest,
  StateTransition,
} from '@nexus/platform';
import { PaymentNotification } from '../../../domain/payment-notification.entity';
import {
  PaymentNotificationStatus,
  type PaymentNotificationId,
} from '../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import {
  PAYMENT_NOTIFICATION_ACTIONS,
  PAYMENT_NOTIFICATION_WORKFLOW,
} from '../../payment-notification-workflow';
import type { Clock } from '../create-draft';

const PAYMENT_NOTIFICATIONS_MODULE = 'payment-notifications';
const PAYMENT_NOTIFICATION_START_REVIEW_EVENT =
  'payment-notification.start-review';

export interface StartReviewPaymentNotificationRequest {
  readonly id: PaymentNotificationId;
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
      processRequest: this.createProcessRequest(paymentNotification),
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

  private createProcessRequest(
    paymentNotification: PaymentNotification,
  ): ProcessRequest {
    return {
      permissionRequest: {
        permissions: [
          {
            module: PAYMENT_NOTIFICATIONS_MODULE,
            action: PAYMENT_NOTIFICATION_ACTIONS.START_REVIEW,
            effect: 'allow',
          },
        ],
        module: PAYMENT_NOTIFICATIONS_MODULE,
        action: PAYMENT_NOTIFICATION_ACTIONS.START_REVIEW,
      },
      workflowConfiguration: {
        workflows: [PAYMENT_NOTIFICATION_WORKFLOW],
        routes: [
          {
            eventId: PAYMENT_NOTIFICATION_START_REVIEW_EVENT,
            enabled: true,
            workflowId: PAYMENT_NOTIFICATION_WORKFLOW.workflowId,
            approvalGroupIds: [],
          },
        ],
        approvalGroups: [],
      },
      workflowEvent: {
        eventId: PAYMENT_NOTIFICATION_START_REVIEW_EVENT,
        module: PAYMENT_NOTIFICATIONS_MODULE,
        action: PAYMENT_NOTIFICATION_ACTIONS.START_REVIEW,
      },
      currentState: paymentNotification.status,
      action: PAYMENT_NOTIFICATION_ACTIONS.START_REVIEW,
      notificationConfiguration: {
        templates: [],
        routes: [
          {
            eventId: PAYMENT_NOTIFICATION_START_REVIEW_EVENT,
            enabled: false,
            channels: [],
            templateIds: [],
            recipientGroups: [],
          },
        ],
        recipientGroups: [],
      },
      notificationEvent: {
        eventId: PAYMENT_NOTIFICATION_START_REVIEW_EVENT,
        module: PAYMENT_NOTIFICATIONS_MODULE,
        action: PAYMENT_NOTIFICATION_ACTIONS.START_REVIEW,
      },
    };
  }
}
