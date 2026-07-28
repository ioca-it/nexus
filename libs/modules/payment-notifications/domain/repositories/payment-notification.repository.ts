import type { PaymentNotification } from '../payment-notification.entity';
import type {
  CustomerId,
  PaymentNotificationId,
} from '../payment-notification.types';

export interface PaymentNotificationRepository {
  create(notification: PaymentNotification): Promise<void>;
  update(notification: PaymentNotification): Promise<void>;
  findById(id: PaymentNotificationId): Promise<PaymentNotification | null>;
  exists(id: PaymentNotificationId): Promise<boolean>;
  findByBankReference(
    customerId: CustomerId,
    bankReference: string,
  ): Promise<readonly PaymentNotification[]>;
  findByCustomer(
    customerId: CustomerId,
  ): Promise<readonly PaymentNotification[]>;
}
