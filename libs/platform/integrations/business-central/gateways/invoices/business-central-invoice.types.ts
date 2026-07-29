export interface BusinessCentralInvoice {
  readonly id: string;
  readonly number: string;
  readonly customerId: string;
  readonly customerNumber?: string;
  readonly invoiceDate: Date;
  readonly dueDate?: Date;
  readonly currencyCode?: string;
  readonly totalAmount: number;
  readonly remainingAmount?: number;
  readonly status?: string;
}

export interface BusinessCentralInvoiceGateway {
  findById(id: string): Promise<BusinessCentralInvoice | null>;

  findByCustomer(
    customerId: string,
  ): Promise<readonly BusinessCentralInvoice[]>;
}
