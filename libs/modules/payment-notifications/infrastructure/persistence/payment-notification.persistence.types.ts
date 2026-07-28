export interface PaymentNotificationRecord {
  readonly id: string;
  readonly customerId: string;
  readonly status: string;
  readonly paymentDate: string;
  readonly amount: number;
  readonly currency: string;
  readonly bankReference: string;
  readonly receiptFileId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PaymentNotificationInvoiceRecord {
  readonly id: string;
  readonly paymentNotificationId: string;
  readonly invoiceId: string;
  readonly createdAt: string;
}
