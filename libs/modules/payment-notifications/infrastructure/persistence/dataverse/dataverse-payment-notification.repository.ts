import type { PaymentNotification } from '../../../domain/payment-notification.entity';
import type {
  CustomerId,
  PaymentNotificationId,
} from '../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import {
  toDomain,
  toPersistence,
  type PaymentNotificationMapper,
  type PaymentNotificationPersistence,
} from '../mappers';
import type { DataversePaymentNotificationGateway } from './dataverse-payment-notification.gateway';

const defaultMapper: PaymentNotificationMapper = Object.freeze({
  toPersistence,
  toDomain,
});

export class DataversePaymentNotificationRepository
  implements PaymentNotificationRepository
{
  private readonly gateway: DataversePaymentNotificationGateway;
  private readonly mapper: PaymentNotificationMapper;

  constructor(dependencies: {
    readonly gateway: DataversePaymentNotificationGateway;
    readonly mapper?: PaymentNotificationMapper;
  }) {
    this.gateway = dependencies.gateway;
    this.mapper = dependencies.mapper ?? defaultMapper;
  }

  async create(notification: PaymentNotification): Promise<void> {
    const persistence = this.mapper.toPersistence(notification);

    await this.gateway.create(persistence);
  }

  async update(notification: PaymentNotification): Promise<void> {
    const persistence = this.mapper.toPersistence(notification);

    await this.gateway.replace(persistence);
  }

  async findById(
    id: PaymentNotificationId,
  ): Promise<PaymentNotification | null> {
    const persistence = await this.gateway.findById(id);

    if (!persistence) {
      return null;
    }

    return this.toDomain(persistence);
  }

  exists(id: PaymentNotificationId): Promise<boolean> {
    return this.gateway.exists(id);
  }

  async findByBankReference(
    customerId: CustomerId,
    bankReference: string,
  ): Promise<readonly PaymentNotification[]> {
    const persistence = await this.gateway.findByBankReference(
      customerId,
      bankReference,
    );

    return Object.freeze(persistence.map((record) => this.toDomain(record)));
  }

  async findByCustomer(
    customerId: CustomerId,
  ): Promise<readonly PaymentNotification[]> {
    const persistence = await this.gateway.findByCustomer(customerId);

    return Object.freeze(persistence.map((record) => this.toDomain(record)));
  }

  private toDomain(
    persistence: PaymentNotificationPersistence,
  ): PaymentNotification {
    return this.mapper.toDomain(persistence.notification, persistence.invoices);
  }
}
