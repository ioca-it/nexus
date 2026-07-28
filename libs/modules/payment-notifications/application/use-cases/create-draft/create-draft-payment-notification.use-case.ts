import { PaymentNotification } from '../../../domain/payment-notification.entity';
import type {
  CustomerId,
  PaymentNotificationId,
} from '../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../domain/repositories';

export interface CreateDraftPaymentNotificationRequest {
  readonly id: PaymentNotificationId;
  readonly customerId: CustomerId;
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
    const timestamp = this.clock();
    const paymentNotification = PaymentNotification.create({
      ...request,
      createdAt: new Date(timestamp.getTime()),
      updatedAt: new Date(timestamp.getTime()),
    });

    await this.repository.create(paymentNotification);

    return { paymentNotification };
  }
}
