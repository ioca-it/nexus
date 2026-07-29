import {
  createBusinessCentralCustomerId,
  createFinanceCreditMemoId,
  type BusinessCentralCustomerId,
  type FinanceCreditMemoId,
} from './finance.types';

export interface CreditMemo {
  readonly id: FinanceCreditMemoId;
  readonly number: string;
  readonly businessCentralCustomerId: BusinessCentralCustomerId;
  readonly customerNumber?: string;
  readonly creditMemoDate: Date;
  readonly currencyCode?: string;
  readonly totalAmount: number;
  readonly remainingAmount?: number;
  readonly status?: string;
}

export interface CreateCreditMemoInput {
  readonly id: FinanceCreditMemoId;
  readonly number: string;
  readonly businessCentralCustomerId: BusinessCentralCustomerId;
  readonly customerNumber?: string;
  readonly creditMemoDate: Date;
  readonly currencyCode?: string;
  readonly totalAmount: number;
  readonly remainingAmount?: number;
  readonly status?: string;
}

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  return value === undefined ? undefined : value.trim();
}

function copyDate(value: Date, fieldName: string): Date {
  const copied = new Date(value.getTime());

  if (!Number.isFinite(copied.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return Object.freeze(copied);
}

function requireFiniteAmount(value: number, fieldName: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be finite`);
  }

  return value;
}

export function createCreditMemo(input: CreateCreditMemoInput): CreditMemo {
  const customerNumber = normalizeOptionalString(input.customerNumber);
  const currencyCode = normalizeOptionalString(input.currencyCode);
  const remainingAmount =
    input.remainingAmount === undefined
      ? undefined
      : requireFiniteAmount(
          input.remainingAmount,
          'Credit memo remaining amount',
        );
  const status = normalizeOptionalString(input.status);

  return Object.freeze({
    id: createFinanceCreditMemoId(input.id),
    number: normalizeRequiredString(input.number, 'Credit memo number'),
    businessCentralCustomerId: createBusinessCentralCustomerId(
      input.businessCentralCustomerId,
    ),
    ...(customerNumber === undefined ? {} : { customerNumber }),
    creditMemoDate: copyDate(input.creditMemoDate, 'Credit memo date'),
    ...(currencyCode === undefined ? {} : { currencyCode }),
    totalAmount: requireFiniteAmount(
      input.totalAmount,
      'Credit memo total amount',
    ),
    ...(remainingAmount === undefined ? {} : { remainingAmount }),
    ...(status === undefined ? {} : { status }),
  });
}
