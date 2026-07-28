import { PaymentNotification } from '../../../domain/payment-notification.entity';
import {
  PaymentNotificationStatus,
  type PaymentNotificationId,
} from '../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import type { Clock } from '../create-draft';

export interface UpdatePaymentNotificationRequest {
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
