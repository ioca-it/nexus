declare const financeInvoiceIdBrand: unique symbol;
declare const financeCreditMemoIdBrand: unique symbol;
declare const nexusCustomerIdBrand: unique symbol;
declare const businessCentralCustomerIdBrand: unique symbol;

export type FinanceInvoiceId = string & {
  readonly [financeInvoiceIdBrand]: 'FinanceInvoiceId';
};

export type FinanceCreditMemoId = string & {
  readonly [financeCreditMemoIdBrand]: 'FinanceCreditMemoId';
};

export type NexusCustomerId = string & {
  readonly [nexusCustomerIdBrand]: 'NexusCustomerId';
};

export type BusinessCentralCustomerId = string & {
  readonly [businessCentralCustomerIdBrand]: 'BusinessCentralCustomerId';
};

function createIdentifier<T extends string>(
  value: string,
  fieldName: string,
): T {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized as T;
}

export function createFinanceInvoiceId(value: string): FinanceInvoiceId {
  return createIdentifier<FinanceInvoiceId>(value, 'Finance invoice id');
}

export function createFinanceCreditMemoId(value: string): FinanceCreditMemoId {
  return createIdentifier<FinanceCreditMemoId>(value, 'Finance credit memo id');
}

export function createNexusCustomerId(value: string): NexusCustomerId {
  return createIdentifier<NexusCustomerId>(value, 'NEXUS customer id');
}

export function createBusinessCentralCustomerId(
  value: string,
): BusinessCentralCustomerId {
  return createIdentifier<BusinessCentralCustomerId>(
    value,
    'Business Central customer id',
  );
}
