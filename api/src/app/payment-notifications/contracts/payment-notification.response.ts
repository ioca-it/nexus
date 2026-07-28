export interface PaymentNotificationResponse {
  readonly id: string;
  readonly status: string;
  readonly customerId: string;
  readonly paymentDate: string;
  readonly amount: number;
  readonly currency: string;
  readonly bankReference: string;
  readonly receiptFileId?: string;
  readonly invoiceIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}
