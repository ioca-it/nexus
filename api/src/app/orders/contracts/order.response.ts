export interface OrderLineResponse {
  readonly id: string;
  readonly productId: string;
  readonly productNumber: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitOfMeasureCode?: string;
  readonly currencyCode: string;
  readonly unitPrice: number;
  readonly lineSubtotal: number;
}
export interface OrderResponse {
  readonly id: string;
  readonly status: 'DRAFT';
  readonly currencyCode: string;
  readonly lines: readonly OrderLineResponse[];
  readonly subtotal: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
