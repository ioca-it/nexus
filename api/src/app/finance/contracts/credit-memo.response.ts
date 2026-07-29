export interface FinanceCreditMemoResponse {
  readonly id: string;
  readonly number: string;
  readonly creditMemoDate: string;
  readonly currencyCode?: string;
  readonly totalAmount: number;
  readonly remainingAmount?: number;
  readonly status?: string;
}
