import {
  createBusinessCentralCustomerId,
  createFinanceInvoiceId,
  type BusinessCentralCustomerId,
  type FinanceInvoiceId,
} from './finance.types';

export interface Invoice {
  readonly id: FinanceInvoiceId;
  readonly number: string;
  readonly businessCentralCustomerId: BusinessCentralCustomerId;
  readonly customerNumber?: string;
  readonly invoiceDate: Date;
  readonly dueDate?: Date;
  readonly currencyCode?: string;
  readonly totalAmount: number;
  readonly remainingAmount?: number;
  readonly status?: string;
}

export interface CreateInvoiceInput {
  readonly id: FinanceInvoiceId;
  readonly number: string;
  readonly businessCentralCustomerId: BusinessCentralCustomerId;
  readonly customerNumber?: string;
  readonly invoiceDate: Date;
  readonly dueDate?: Date;
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

export function createInvoice(input: CreateInvoiceInput): Invoice {
  const customerNumber = normalizeOptionalString(input.customerNumber);
  const dueDate =
    input.dueDate === undefined
      ? undefined
      : copyDate(input.dueDate, 'Invoice due date');
  const currencyCode = normalizeOptionalString(input.currencyCode);
  const remainingAmount =
    input.remainingAmount === undefined
      ? undefined
      : requireFiniteAmount(input.remainingAmount, 'Invoice remaining amount');
  const status = normalizeOptionalString(input.status);

  return Object.freeze({
    id: createFinanceInvoiceId(input.id),
    number: normalizeRequiredString(input.number, 'Invoice number'),
    businessCentralCustomerId: createBusinessCentralCustomerId(
      input.businessCentralCustomerId,
    ),
    ...(customerNumber === undefined ? {} : { customerNumber }),
    invoiceDate: copyDate(input.invoiceDate, 'Invoice date'),
    ...(dueDate === undefined ? {} : { dueDate }),
    ...(currencyCode === undefined ? {} : { currencyCode }),
    totalAmount: requireFiniteAmount(input.totalAmount, 'Invoice total amount'),
    ...(remainingAmount === undefined ? {} : { remainingAmount }),
    ...(status === undefined ? {} : { status }),
  });
}
