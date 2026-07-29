export interface BusinessCentralReceivable {
  readonly id: string;
  readonly customerId: string;
  readonly documentType: string;
  readonly documentNumber: string;
  readonly postingDate: Date;
  readonly dueDate?: Date;
  readonly originalAmount: number;
  readonly remainingAmount: number;
  readonly currencyCode?: string;
  readonly open: boolean;
}

export interface BusinessCentralReceivableGateway {
  findOpenByCustomer(
    customerId: string,
  ): Promise<readonly BusinessCentralReceivable[]>;
}
