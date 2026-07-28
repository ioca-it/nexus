import type { AuthenticatedActor } from '@nexus/platform';
import type { PaymentNotification } from '../../../domain/payment-notification.entity';
import type { PaymentNotificationId } from '../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import { assertPaymentNotificationReadAccess } from './payment-notification-query-access';

export type PaymentNotificationReadScope = 'customer' | 'administrative';

export interface GetPaymentNotificationByIdRequest {
  readonly actor: AuthenticatedActor;
  readonly id: PaymentNotificationId;
}

export interface GetPaymentNotificationByIdResult {
  readonly paymentNotification: PaymentNotification;
}

export class GetPaymentNotificationByIdUseCase {
  private readonly repository: PaymentNotificationRepository;
  private readonly scope: PaymentNotificationReadScope;

  constructor(dependencies: {
    readonly repository: PaymentNotificationRepository;
    readonly scope: PaymentNotificationReadScope;
  }) {
    this.repository = dependencies.repository;
    this.scope = dependencies.scope;
  }

  async execute(
    request: GetPaymentNotificationByIdRequest,
  ): Promise<GetPaymentNotificationByIdResult> {
    const paymentNotification = await this.repository.findById(request.id);

    if (!paymentNotification) {
      throw new Error('Payment notification not found');
    }

    assertPaymentNotificationReadAccess({
      actor: request.actor,
      resourceCustomerId:
        this.scope === 'customer'
          ? paymentNotification.customerId
          : undefined,
    });

    return Object.freeze({ paymentNotification });
  }
}
