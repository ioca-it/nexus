import {
  createBusinessCentralCustomApiMetadata,
  type BusinessCentralCustomApiMetadata,
} from '../common';

export interface ReceivableApiRecord {
  readonly id: string;
  readonly customerId: string;
  readonly documentType: string;
  readonly documentNumber: string;
  readonly postingDate: string;
  readonly dueDate?: string;
  readonly originalAmount: number;
  readonly remainingAmount: number;
  readonly currencyCode?: string;
  readonly open: boolean;
  readonly lastModifiedDateTime?: string;
}

export interface ReceivablesApiContract {
  readonly metadata: BusinessCentralCustomApiMetadata;
  readonly fields: readonly [
    'id',
    'customerId',
    'documentType',
    'documentNumber',
    'postingDate',
    'dueDate',
    'originalAmount',
    'remainingAmount',
    'currencyCode',
    'open',
    'lastModifiedDateTime',
  ];
  readonly requiredFilters: readonly ['customerId', 'open'];
  readonly readOnly: true;
}

export const RECEIVABLES_API_FIELDS: ReceivablesApiContract['fields'] =
  Object.freeze([
    'id',
    'customerId',
    'documentType',
    'documentNumber',
    'postingDate',
    'dueDate',
    'originalAmount',
    'remainingAmount',
    'currencyCode',
    'open',
    'lastModifiedDateTime',
  ]);

export const RECEIVABLES_API_REQUIRED_FILTERS: ReceivablesApiContract['requiredFilters'] =
  Object.freeze(['customerId', 'open']);

export function createReceivablesApiContract(
  metadata: BusinessCentralCustomApiMetadata,
): ReceivablesApiContract {
  return Object.freeze({
    metadata: createBusinessCentralCustomApiMetadata(metadata),
    fields: RECEIVABLES_API_FIELDS,
    requiredFilters: RECEIVABLES_API_REQUIRED_FILTERS,
    readOnly: true,
  });
}

function invalidRecord(fieldName: string): never {
  throw new Error(
    `Invalid Business Central receivables API record: ${fieldName} is invalid`,
  );
}

function requiredString(
  record: Readonly<Record<string, unknown>>,
  fieldName: string,
): string {
  const value = record[fieldName];

  if (typeof value !== 'string' || value.trim().length === 0) {
    return invalidRecord(fieldName);
  }

  return value.trim();
}

function optionalString(
  record: Readonly<Record<string, unknown>>,
  fieldName: string,
): string | undefined {
  const value = record[fieldName];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return invalidRecord(fieldName);
  }

  return value.trim();
}

function finiteNumber(
  record: Readonly<Record<string, unknown>>,
  fieldName: string,
): number {
  const value = record[fieldName];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return invalidRecord(fieldName);
  }

  return value;
}

function booleanValue(
  record: Readonly<Record<string, unknown>>,
  fieldName: string,
): boolean {
  const value = record[fieldName];

  if (typeof value !== 'boolean') {
    return invalidRecord(fieldName);
  }

  return value;
}

function parseIsoDate(value: unknown): string | undefined {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(
      value.trim(),
    )
  ) {
    return undefined;
  }

  const normalized = value.trim();
  const parsed = new Date(normalized);

  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized.slice(0, 10)
  ) {
    return undefined;
  }

  return normalized;
}

function requiredIsoDate(
  record: Readonly<Record<string, unknown>>,
  fieldName: string,
): string {
  return parseIsoDate(record[fieldName]) ?? invalidRecord(fieldName);
}

function optionalIsoDate(
  record: Readonly<Record<string, unknown>>,
  fieldName: string,
): string | undefined {
  if (record[fieldName] === undefined) {
    return undefined;
  }

  return requiredIsoDate(record, fieldName);
}

export function validateReceivableApiRecord(
  record: Readonly<Record<string, unknown>>,
): ReceivableApiRecord {
  const dueDate = optionalIsoDate(record, 'dueDate');
  const currencyCode = optionalString(record, 'currencyCode');
  const lastModifiedDateTime = optionalIsoDate(record, 'lastModifiedDateTime');

  return Object.freeze({
    id: requiredString(record, 'id'),
    customerId: requiredString(record, 'customerId'),
    documentType: requiredString(record, 'documentType'),
    documentNumber: requiredString(record, 'documentNumber'),
    postingDate: requiredIsoDate(record, 'postingDate'),
    ...(dueDate === undefined ? {} : { dueDate }),
    originalAmount: finiteNumber(record, 'originalAmount'),
    remainingAmount: finiteNumber(record, 'remainingAmount'),
    ...(currencyCode === undefined ? {} : { currencyCode }),
    open: booleanValue(record, 'open'),
    ...(lastModifiedDateTime === undefined ? {} : { lastModifiedDateTime }),
  });
}
