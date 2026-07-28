import type { AuthenticatedActor } from '@nexus/platform';
import { PaymentNotification } from '../../../domain/payment-notification.entity';
import type { PaymentNotificationId } from '../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import { PAYMENT_NOTIFICATION_PERMISSION_ACTIONS } from '../../payment-notification-workflow';
import { evaluatePaymentNotificationAccess } from '../../security';

export interface CreateDraftPaymentNotificationRequest {
  readonly actor: AuthenticatedActor;
  readonly id: PaymentNotificationId;
  readonly paymentDate: Date;
  readonly amount: number;
  readonly currency: string;
  readonly bankReference: string;
  readonly receiptFileId?: string;
  readonly invoiceIds: readonly string[];
}

export interface CreateDraftPaymentNotificationResult {
  readonly paymentNotification: PaymentNotification;
}

export type Clock = () => Date;

export interface CreateDraftPaymentNotificationDependencies {
  readonly repository: PaymentNotificationRepository;
  readonly clock: Clock;
}

export class CreateDraftPaymentNotificationUseCase {
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
    request: CreateDraftPaymentNotificationRequest,
  ): Promise<CreateDraftPaymentNotificationResult> {
    const accessDecision = evaluatePaymentNotificationAccess({
      actor: request.actor,
      action: PAYMENT_NOTIFICATION_PERMISSION_ACTIONS.CREATE_DRAFT,
      requireCustomer: true,
    });

    if (!accessDecision.allowed || request.actor.customerId === null) {
      throw new Error('Payment notification access denied');
    }

    const timestamp = this.clock();
    const paymentNotification = PaymentNotification.create({
      id: request.id,
      customerId: request.actor.customerId,
      paymentDate: request.paymentDate,
      amount: request.amount,
      currency: request.currency,
      bankReference: request.bankReference,
      receiptFileId: request.receiptFileId,
      invoiceIds: request.invoiceIds,
      createdAt: new Date(timestamp.getTime()),
      updatedAt: new Date(timestamp.getTime()),
    });

    await this.repository.create(paymentNotification);

    return { paymentNotification };
  }
}
