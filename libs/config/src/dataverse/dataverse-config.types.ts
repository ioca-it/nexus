export interface PaymentNotificationDataverseSchemaConfig {
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

export interface AuthenticatedActorDataverseSchemaConfig {
  readonly user: {
    readonly entitySet: string;
    readonly fields: {
      readonly oid: string;
      readonly active: string;
      readonly customerId: string;
    };
  };

  readonly role: {
    readonly entitySet: string;
    readonly fields: {
      readonly oid: string;
      readonly role: string;
    };
  };

  readonly permission: {
    readonly entitySet: string;
    readonly fields: {
      readonly oid: string;
      readonly module: string;
      readonly action: string;
      readonly effect: string;
    };
  };

  readonly approvalGroupMember: {
    readonly entitySet: string;
    readonly fields: {
      readonly oid: string;
      readonly approvalGroupId: string;
    };
  };
}

export interface DataverseConfig {
  readonly environmentUrl: string;
  readonly apiVersion: string;
  readonly paymentNotifications: {
    readonly schema: PaymentNotificationDataverseSchemaConfig;
  };
  readonly authenticatedActor: {
    readonly schema: AuthenticatedActorDataverseSchemaConfig;
  };
}
