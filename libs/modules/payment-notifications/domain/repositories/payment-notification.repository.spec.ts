import type {
  CustomerId,
  PaymentNotification,
  PaymentNotificationId,
  PaymentNotificationRepository as PublicPaymentNotificationRepository,
} from '..';
import type { PaymentNotificationRepository } from './payment-notification.repository';
import type { PaymentNotificationRepository as IndexedPaymentNotificationRepository } from './index';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;

type Assert<Value extends true> = Value;

type ExpectedRepository = {
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
};

describe('PaymentNotificationRepository contract', () => {
  it('exposes exactly the six required methods with their public types', () => {
    const contractIsExact: Assert<
      Equal<PaymentNotificationRepository, ExpectedRepository>
    > = true;

    expect(contractIsExact).toBe(true);
  });

  it('is exported from the repositories index', () => {
    const indexExportIsCorrect: Assert<
      Equal<IndexedPaymentNotificationRepository, PaymentNotificationRepository>
    > = true;

    expect(indexExportIsCorrect).toBe(true);
  });

  it('is exported from the public module', () => {
    const publicExportIsCorrect: Assert<
      Equal<PublicPaymentNotificationRepository, PaymentNotificationRepository>
    > = true;

    expect(publicExportIsCorrect).toBe(true);
  });
});
