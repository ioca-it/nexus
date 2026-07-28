export interface DataversePaymentNotificationSchema {
  readonly notificationEntitySet: string;
  readonly invoiceEntitySet: string;

  readonly notificationFields: {
    readonly id: string;
    readonly customerId: string;
    readonly status: string;
    readonly paymentDate: string;
    readonly amount: string;
    readonly currency: string;
    readonly bankReference: string;
    readonly receiptFileId: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  };

  readonly invoiceFields: {
    readonly id: string;
    readonly paymentNotificationId: string;
    readonly invoiceId: string;
    readonly createdAt: string;
  };
}
