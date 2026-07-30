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

export interface FinanceCustomerReferenceDataverseSchemaConfig {
  readonly customerEntitySet: string;
  readonly customerFields: {
    readonly nexusCustomerId: string;
    readonly businessCentralCustomerId: string;
    readonly active: string;
  };
}

export interface CommercialCatalogDataverseSchemaConfig {
  readonly product: {
    readonly entitySet: string;
    readonly fields: {
      readonly id: string;
      readonly number: string;
      readonly name: string;
      readonly description: string;
      readonly categoryId: string;
      readonly imageReference: string;
      readonly unitOfMeasureCode: string;
      readonly active: string;
    };
  };
  readonly customerPrice: {
    readonly entitySet: string;
    readonly fields: {
      readonly id: string;
      readonly customerId: string;
      readonly productId: string;
      readonly currencyCode: string;
      readonly unitPrice: string;
      readonly minimumQuantity: string;
      readonly validFrom: string;
      readonly validTo: string;
      readonly active: string;
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
  readonly finance: {
    readonly customerReference: {
      readonly schema: FinanceCustomerReferenceDataverseSchemaConfig;
    };
  };
  readonly commercialCatalog: {
    readonly schema: CommercialCatalogDataverseSchemaConfig;
  };
}
