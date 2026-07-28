import type { AuthenticatedActor } from '@nexus/platform';
import type { PaymentNotification } from '../../../domain/payment-notification.entity';
import type { CustomerId } from '../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import { assertPaymentNotificationReadAccess } from './payment-notification-query-access';

export interface ListPaymentNotificationsByCustomerRequest {
  readonly actor: AuthenticatedActor;
  readonly customerId: CustomerId;
}

export interface ListPaymentNotificationsByCustomerResult {
  readonly paymentNotifications: readonly PaymentNotification[];
}

export class ListPaymentNotificationsByCustomerUseCase {
  private readonly repository: PaymentNotificationRepository;

  constructor(dependencies: {
    readonly repository: PaymentNotificationRepository;
  }) {
    this.repository = dependencies.repository;
  }

  async execute(
    request: ListPaymentNotificationsByCustomerRequest,
  ): Promise<ListPaymentNotificationsByCustomerResult> {
    assertPaymentNotificationReadAccess({ actor: request.actor });

    const paymentNotifications = await this.repository.findByCustomer(
      request.customerId,
    );

    return Object.freeze({
      paymentNotifications: Object.freeze([...paymentNotifications]),
    });
  }
}
