import type { AuthenticatedActor } from '@nexus/platform';
import { PaymentNotification } from '../../../domain/payment-notification.entity';
import {
  PaymentNotificationStatus,
  type PaymentNotificationId,
} from '../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import { PAYMENT_NOTIFICATION_PERMISSION_ACTIONS } from '../../payment-notification-workflow';
import { evaluatePaymentNotificationAccess } from '../../security';
import type { Clock } from '../create-draft';

export interface UpdatePaymentNotificationRequest {
  readonly actor: AuthenticatedActor;
  readonly id: PaymentNotificationId;
  readonly paymentDate: Date;
  readonly amount: number;
  readonly currency: string;
  readonly bankReference: string;
  readonly receiptFileId?: string;
  readonly invoiceIds: readonly string[];
}

export interface UpdatePaymentNotificationResult {
  readonly paymentNotification: PaymentNotification;
}

export interface UpdatePaymentNotificationDependencies {
  readonly repository: PaymentNotificationRepository;
  readonly clock: Clock;
}

export class UpdatePaymentNotificationUseCase {
  private readonly repository: PaymentNotificationRepository;
  private readonly clock: Clock;

  constructor(dependencies: {
    readonly repository: PaymentNotificationRepository;
    readonly clock?: Clock;
  }) {
    this.repository = dependencies.repository;
    this.clock = dependencies.clock ?? (() => new Date());
  }

  async execute(
    request: UpdatePaymentNotificationRequest,
  ): Promise<UpdatePaymentNotificationResult> {
    const paymentNotification = await this.repository.findById(request.id);

    if (!paymentNotification) {
      throw new Error('Payment notification not found');
    }

    const accessDecision = evaluatePaymentNotificationAccess({
      actor: request.actor,
      action: PAYMENT_NOTIFICATION_PERMISSION_ACTIONS.UPDATE,
      resourceCustomerId: paymentNotification.customerId,
    });

    if (!accessDecision.allowed) {
      throw new Error('Payment notification access denied');
    }

    if (
      paymentNotification.status !== PaymentNotificationStatus.DRAFT &&
      paymentNotification.status !== PaymentNotificationStatus.CHANGES_REQUESTED
    ) {
      throw new Error(
        'Payment notification cannot be edited in its current status',
      );
    }

    const updatedAt = this.clock();
    const updatedPaymentNotification = paymentNotification.updateDetails(
      {
        paymentDate: request.paymentDate,
        amount: request.amount,
        currency: request.currency,
        bankReference: request.bankReference,
        receiptFileId: request.receiptFileId,
        invoiceIds: request.invoiceIds,
      },
      updatedAt,
    );

    await this.repository.update(updatedPaymentNotification);

    return Object.freeze({
      paymentNotification: updatedPaymentNotification,
    });
  }
}
