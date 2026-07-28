import type { PaymentNotificationPersistence } from '../mappers';

export interface DataversePaymentNotificationGateway {
  create(persistence: PaymentNotificationPersistence): Promise<void>;
  replace(persistence: PaymentNotificationPersistence): Promise<void>;
  findById(id: string): Promise<PaymentNotificationPersistence | null>;
  exists(id: string): Promise<boolean>;
  findByBankReference(
    customerId: string,
    bankReference: string,
  ): Promise<readonly PaymentNotificationPersistence[]>;
  findByCustomer(
    customerId: string,
  ): Promise<readonly PaymentNotificationPersistence[]>;
}
