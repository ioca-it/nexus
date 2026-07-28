import {
  PaymentNotificationStatus,
  type CreatePaymentNotificationInput,
  type CustomerId,
  type PaymentNotificationEditableDetails,
  type PaymentNotificationId,
  type PaymentNotificationStatus as PaymentNotificationStatusType,
} from './payment-notification.types';

function isPaymentNotificationStatus(
  value: unknown,
): value is PaymentNotificationStatusType {
  return Object.values(PaymentNotificationStatus).some(
    (status) => status === value,
  );
}

function validateUpdatedAt(updatedAt: Date, createdAtTimestamp: number): void {
  if (!(updatedAt instanceof Date) || Number.isNaN(updatedAt.getTime())) {
    throw new Error('Payment notification updatedAt is invalid');
  }

  if (updatedAt.getTime() < createdAtTimestamp) {
    throw new Error(
      'Payment notification updatedAt cannot be earlier than createdAt',
    );
  }
}

export class PaymentNotification {
  readonly id: PaymentNotificationId;
  readonly customerId: CustomerId;
  readonly status: PaymentNotificationStatusType;
  readonly amount: number;
  readonly currency: string;
  readonly bankReference: string;
  readonly receiptFileId?: string;
  readonly invoiceIds: readonly string[];

  private readonly paymentDateTimestamp: number;
  private readonly createdAtTimestamp: number;
  private readonly updatedAtTimestamp: number;

  private constructor(
    input: CreatePaymentNotificationInput,
    status: PaymentNotificationStatusType = PaymentNotificationStatus.DRAFT,
  ) {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error('Payment notification amount must be greater than zero');
    }

    if (
      typeof input.customerId !== 'string' ||
      input.customerId.trim().length === 0
    ) {
      throw new Error('Payment notification customerId is required');
    }

    if (
      typeof input.bankReference !== 'string' ||
      input.bankReference.trim().length === 0
    ) {
      throw new Error('Payment notification bankReference is required');
    }

    if (
      !(input.paymentDate instanceof Date) ||
      Number.isNaN(input.paymentDate.getTime())
    ) {
      throw new Error('Payment notification paymentDate is required');
    }

    this.id = input.id;
    this.customerId = input.customerId;
    this.status = status;
    this.paymentDateTimestamp = input.paymentDate.getTime();
    this.amount = input.amount;
    this.currency = input.currency;
    this.bankReference = input.bankReference;
    this.receiptFileId = input.receiptFileId;
    this.invoiceIds = Object.freeze([...input.invoiceIds]);
    this.createdAtTimestamp = input.createdAt.getTime();
    this.updatedAtTimestamp = input.updatedAt.getTime();

    Object.freeze(this);
  }

  static create(input: CreatePaymentNotificationInput): PaymentNotification {
    return new PaymentNotification(input);
  }

  transitionTo(
    nextStatus: PaymentNotificationStatusType,
    updatedAt: Date,
  ): PaymentNotification {
    if (!isPaymentNotificationStatus(nextStatus)) {
      throw new Error('Payment notification status is invalid');
    }

    validateUpdatedAt(updatedAt, this.createdAtTimestamp);

    return new PaymentNotification(
      {
        id: this.id,
        customerId: this.customerId,
        paymentDate: this.paymentDate,
        amount: this.amount,
        currency: this.currency,
        bankReference: this.bankReference,
        receiptFileId: this.receiptFileId,
        invoiceIds: this.invoiceIds,
        createdAt: this.createdAt,
        updatedAt: new Date(updatedAt.getTime()),
      },
      nextStatus,
    );
  }

  updateDetails(
    details: PaymentNotificationEditableDetails,
    updatedAt: Date,
  ): PaymentNotification {
    validateUpdatedAt(updatedAt, this.createdAtTimestamp);

    return new PaymentNotification(
      {
        id: this.id,
        customerId: this.customerId,
        paymentDate: details.paymentDate,
        amount: details.amount,
        currency: details.currency,
        bankReference: details.bankReference,
        receiptFileId: details.receiptFileId,
        invoiceIds: details.invoiceIds,
        createdAt: this.createdAt,
        updatedAt: new Date(updatedAt.getTime()),
      },
      this.status,
    );
  }

  get paymentDate(): Date {
    return new Date(this.paymentDateTimestamp);
  }

  get createdAt(): Date {
    return new Date(this.createdAtTimestamp);
  }

  get updatedAt(): Date {
    return new Date(this.updatedAtTimestamp);
  }
}
