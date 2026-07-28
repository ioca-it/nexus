export type PaymentNotificationId = string;
export type CustomerId = string;

export const PaymentNotificationStatus = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  VALIDATED: 'VALIDATED',
  REJECTED: 'REJECTED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
} as const);

export type PaymentNotificationStatus =
  (typeof PaymentNotificationStatus)[keyof typeof PaymentNotificationStatus];

export interface CreatePaymentNotificationInput {
  readonly id: PaymentNotificationId;
  readonly customerId: CustomerId;
  readonly paymentDate: Date;
  readonly amount: number;
  readonly currency: string;
  readonly bankReference: string;
  readonly receiptFileId?: string;
  readonly invoiceIds: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PaymentNotificationEditableDetails {
  readonly paymentDate: Date;
  readonly amount: number;
  readonly currency: string;
  readonly bankReference: string;
  readonly receiptFileId?: string;
  readonly invoiceIds: readonly string[];
}
