export interface OrdersDataverseSchemaConfig {
  readonly order: {
    readonly entitySet: string;
    readonly fields: {
      readonly id: string;
      readonly customerId: string;
      readonly status: string;
      readonly currencyCode: string;
      readonly subtotal: string;
      readonly createdAt: string;
      readonly updatedAt: string;
    };
  };
  readonly orderLine: {
    readonly entitySet: string;
    readonly fields: {
      readonly id: string;
      readonly orderId: string;
      readonly productId: string;
      readonly productNumber: string;
      readonly productName: string;
      readonly unitOfMeasureCode: string;
      readonly currencyCode: string;
      readonly quantity: string;
      readonly unitPrice: string;
      readonly lineSubtotal: string;
    };
  };
}
