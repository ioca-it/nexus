export interface FinanceInvoiceResponse {
  readonly id: string;
  readonly number: string;
  readonly invoiceDate: string;
  readonly dueDate?: string;
  readonly currencyCode?: string;
  readonly totalAmount: number;
  readonly remainingAmount?: number;
  readonly status?: string;
}
