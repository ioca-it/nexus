export interface CustomerPriceResponse {
  readonly currencyCode: string;
  readonly unitPrice: number;
  readonly minimumQuantity?: number;
  readonly validFrom?: string;
  readonly validTo?: string;
}
