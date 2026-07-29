import {
  createBusinessCentralCustomApiMetadata,
  type BusinessCentralCustomApiMetadata,
} from '../common';

export interface InventoryAvailabilityApiRecord {
  readonly itemId: string;
  readonly itemNumber: string;
  readonly availableQuantity: number;
  readonly inventoryQuantity?: number;
  readonly unitOfMeasureCode?: string;
  readonly lastModifiedDateTime?: string;
}

export interface InventoryAvailabilityApiContract {
  readonly metadata: BusinessCentralCustomApiMetadata;
  readonly fields: readonly [
    'itemId',
    'itemNumber',
    'availableQuantity',
    'inventoryQuantity',
    'unitOfMeasureCode',
    'lastModifiedDateTime',
  ];
  readonly requiredFilters: readonly ['itemId'];
  readonly supportsGroupedItemFilter: true;
  readonly readOnly: true;
}

export const INVENTORY_AVAILABILITY_API_FIELDS: InventoryAvailabilityApiContract['fields'] =
  Object.freeze([
    'itemId',
    'itemNumber',
    'availableQuantity',
    'inventoryQuantity',
    'unitOfMeasureCode',
    'lastModifiedDateTime',
  ]);

export const INVENTORY_AVAILABILITY_API_REQUIRED_FILTERS: InventoryAvailabilityApiContract['requiredFilters'] =
  Object.freeze(['itemId']);

export function createInventoryAvailabilityApiContract(
  metadata: BusinessCentralCustomApiMetadata,
): InventoryAvailabilityApiContract {
  return Object.freeze({
    metadata: createBusinessCentralCustomApiMetadata(metadata),
    fields: INVENTORY_AVAILABILITY_API_FIELDS,
    requiredFilters: INVENTORY_AVAILABILITY_API_REQUIRED_FILTERS,
    supportsGroupedItemFilter: true,
    readOnly: true,
  });
}

function invalidRecord(fieldName: string): never {
  throw new Error(
    `Invalid Business Central inventory availability API record: ${fieldName} is invalid`,
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

function optionalFiniteNumber(
  record: Readonly<Record<string, unknown>>,
  fieldName: string,
): number | undefined {
  if (record[fieldName] === undefined) {
    return undefined;
  }

  return finiteNumber(record, fieldName);
}

function optionalIsoDate(
  record: Readonly<Record<string, unknown>>,
  fieldName: string,
): string | undefined {
  const value = record[fieldName];

  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(
      value.trim(),
    )
  ) {
    return invalidRecord(fieldName);
  }

  const normalized = value.trim();
  const parsed = new Date(normalized);

  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized.slice(0, 10)
  ) {
    return invalidRecord(fieldName);
  }

  return normalized;
}

export function validateInventoryAvailabilityApiRecord(
  record: Readonly<Record<string, unknown>>,
): InventoryAvailabilityApiRecord {
  const inventoryQuantity = optionalFiniteNumber(record, 'inventoryQuantity');
  const unitOfMeasureCode = optionalString(record, 'unitOfMeasureCode');
  const lastModifiedDateTime = optionalIsoDate(record, 'lastModifiedDateTime');

  return Object.freeze({
    itemId: requiredString(record, 'itemId'),
    itemNumber: requiredString(record, 'itemNumber'),
    availableQuantity: finiteNumber(record, 'availableQuantity'),
    ...(inventoryQuantity === undefined ? {} : { inventoryQuantity }),
    ...(unitOfMeasureCode === undefined ? {} : { unitOfMeasureCode }),
    ...(lastModifiedDateTime === undefined ? {} : { lastModifiedDateTime }),
  });
}
