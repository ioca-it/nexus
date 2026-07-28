import type { AuthenticatedActor } from '@nexus/platform';
import type { PaymentNotification } from '../../../domain/payment-notification.entity';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import { assertPaymentNotificationReadAccess } from './payment-notification-query-access';

export interface ListCustomerPaymentNotificationsRequest {
  readonly actor: AuthenticatedActor;
}

export interface ListCustomerPaymentNotificationsResult {
  readonly paymentNotifications: readonly PaymentNotification[];
}

export class ListCustomerPaymentNotificationsUseCase {
  private readonly repository: PaymentNotificationRepository;

  constructor(dependencies: {
    readonly repository: PaymentNotificationRepository;
  }) {
    this.repository = dependencies.repository;
  }

  async execute(
    request: ListCustomerPaymentNotificationsRequest,
  ): Promise<ListCustomerPaymentNotificationsResult> {
    assertPaymentNotificationReadAccess({
      actor: request.actor,
      requireCustomer: true,
    });

    if (request.actor.customerId === null) {
      throw new Error('Payment notification access denied');
    }

    const paymentNotifications = await this.repository.findByCustomer(
      request.actor.customerId,
    );

    return Object.freeze({
      paymentNotifications: Object.freeze([...paymentNotifications]),
    });
  }
}
