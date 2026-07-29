import type { BusinessCentralRecord } from './business-central-record.types';

function invalidRecord(resourceName: string, fieldName: string): Error {
  return new Error(
    `Invalid Business Central ${resourceName} record: ${fieldName} is invalid`,
  );
}

export function requireBusinessCentralRecord(
  value: unknown,
  resourceName: string,
): BusinessCentralRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidRecord(resourceName, 'record');
  }

  return value as BusinessCentralRecord;
}

export function requireString(
  record: BusinessCentralRecord,
  fieldName: string,
  resourceName: string,
): string {
  const value = record[fieldName];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidRecord(resourceName, fieldName);
  }

  return value;
}

export function optionalString(
  record: BusinessCentralRecord,
  fieldName: string,
  resourceName: string,
): string | undefined {
  const value = record[fieldName];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw invalidRecord(resourceName, fieldName);
  }

  return value;
}

export function requireFiniteNumber(
  record: BusinessCentralRecord,
  fieldName: string,
  resourceName: string,
): number {
  const value = record[fieldName];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalidRecord(resourceName, fieldName);
  }

  return value;
}

export function optionalFiniteNumber(
  record: BusinessCentralRecord,
  fieldName: string,
  resourceName: string,
): number | undefined {
  if (record[fieldName] === undefined) {
    return undefined;
  }

  return requireFiniteNumber(record, fieldName, resourceName);
}

function parseIsoDate(value: unknown): Date | undefined {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(
      value,
    )
  ) {
    return undefined;
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return undefined;
  }

  const datePart = value.slice(0, 10);

  if (date.toISOString().slice(0, 10) !== datePart) {
    return undefined;
  }

  return Object.freeze(date);
}

export function requireIsoDate(
  record: BusinessCentralRecord,
  fieldName: string,
  resourceName: string,
): Date {
  const date = parseIsoDate(record[fieldName]);

  if (date === undefined) {
    throw invalidRecord(resourceName, fieldName);
  }

  return date;
}

export function optionalIsoDate(
  record: BusinessCentralRecord,
  fieldName: string,
  resourceName: string,
): Date | undefined {
  if (record[fieldName] === undefined) {
    return undefined;
  }

  return requireIsoDate(record, fieldName, resourceName);
}

export function requireBoolean(
  record: BusinessCentralRecord,
  fieldName: string,
  resourceName: string,
): boolean {
  const value = record[fieldName];

  if (typeof value !== 'boolean') {
    throw invalidRecord(resourceName, fieldName);
  }

  return value;
}
