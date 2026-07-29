export interface BusinessCentralCreditMemo {
  readonly id: string;
  readonly number: string;
  readonly customerId: string;
  readonly customerNumber?: string;
  readonly creditMemoDate: Date;
  readonly currencyCode?: string;
  readonly totalAmount: number;
  readonly remainingAmount?: number;
  readonly status?: string;
}

export interface BusinessCentralCreditMemoGateway {
  findById(id: string): Promise<BusinessCentralCreditMemo | null>;

  findByCustomer(
    customerId: string,
  ): Promise<readonly BusinessCentralCreditMemo[]>;
}
