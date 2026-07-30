import type {
  CatalogProductRecord,
  CommercialCatalogPhysicalRecord,
  CustomerPriceRecord,
  DataverseCatalogProductSchema,
  DataverseCustomerPriceSchema,
} from './commercial-catalog-dataverse.types';

function invalidRecord(resource: string, fieldName: string): never {
  throw new Error(
    `Invalid Dataverse Commercial Catalog ${resource} record: field "${fieldName}" is invalid`,
  );
}

function requiredString(
  record: CommercialCatalogPhysicalRecord,
  fieldName: string,
  resource: string,
): string {
  const value = record[fieldName];

  if (typeof value !== 'string' || value.trim().length === 0) {
    return invalidRecord(resource, fieldName);
  }

  return value.trim();
}

function optionalString(
  record: CommercialCatalogPhysicalRecord,
  fieldName: string,
  resource: string,
): string | undefined {
  const value = record[fieldName];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return invalidRecord(resource, fieldName);
  }

  const normalized = value.trim();

  return normalized.length === 0 ? undefined : normalized;
}

function requiredBoolean(
  record: CommercialCatalogPhysicalRecord,
  fieldName: string,
  resource: string,
): boolean {
  const value = record[fieldName];

  if (typeof value !== 'boolean') {
    return invalidRecord(resource, fieldName);
  }

  return value;
}

function requiredFiniteNumber(
  record: CommercialCatalogPhysicalRecord,
  fieldName: string,
  resource: string,
): number {
  const value = record[fieldName];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return invalidRecord(resource, fieldName);
  }

  return value;
}

function optionalFiniteNumber(
  record: CommercialCatalogPhysicalRecord,
  fieldName: string,
  resource: string,
): number | undefined {
  const value = record[fieldName];

  if (value === undefined || value === null) {
    return undefined;
  }

  return requiredFiniteNumber(record, fieldName, resource);
}

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/;

function optionalIsoDate(
  record: CommercialCatalogPhysicalRecord,
  fieldName: string,
  resource: string,
): string | undefined {
  const value = optionalString(record, fieldName, resource);

  if (value === undefined) {
    return undefined;
  }

  const parsed = new Date(value);

  if (
    !ISO_DATE_PATTERN.test(value) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value.slice(0, 10)
  ) {
    return invalidRecord(resource, fieldName);
  }

  return value;
}

export function validateCatalogProductRecord(
  record: CommercialCatalogPhysicalRecord,
  fields: DataverseCatalogProductSchema['fields'],
): CatalogProductRecord {
  const description = optionalString(record, fields.description, 'product');
  const categoryId = optionalString(record, fields.categoryId, 'product');
  const imageReference = optionalString(
    record,
    fields.imageReference,
    'product',
  );
  const unitOfMeasureCode = optionalString(
    record,
    fields.unitOfMeasureCode,
    'product',
  );

  return Object.freeze({
    id: requiredString(record, fields.id, 'product'),
    number: requiredString(record, fields.number, 'product'),
    name: requiredString(record, fields.name, 'product'),
    ...(description === undefined ? {} : { description }),
    ...(categoryId === undefined ? {} : { categoryId }),
    ...(imageReference === undefined ? {} : { imageReference }),
    ...(unitOfMeasureCode === undefined ? {} : { unitOfMeasureCode }),
    active: requiredBoolean(record, fields.active, 'product'),
  });
}

export function validateCustomerPriceRecord(
  record: CommercialCatalogPhysicalRecord,
  fields: DataverseCustomerPriceSchema['fields'],
): CustomerPriceRecord {
  const minimumQuantity = optionalFiniteNumber(
    record,
    fields.minimumQuantity,
    'customer price',
  );
  const validFrom = optionalIsoDate(record, fields.validFrom, 'customer price');
  const validTo = optionalIsoDate(record, fields.validTo, 'customer price');

  return Object.freeze({
    id: requiredString(record, fields.id, 'customer price'),
    customerId: requiredString(record, fields.customerId, 'customer price'),
    productId: requiredString(record, fields.productId, 'customer price'),
    currencyCode: requiredString(record, fields.currencyCode, 'customer price'),
    unitPrice: requiredFiniteNumber(record, fields.unitPrice, 'customer price'),
    ...(minimumQuantity === undefined ? {} : { minimumQuantity }),
    ...(validFrom === undefined ? {} : { validFrom }),
    ...(validTo === undefined ? {} : { validTo }),
    active: requiredBoolean(record, fields.active, 'customer price'),
  });
}

export function requireValidAsOf(asOf: Date): number {
  const timestamp = asOf.getTime();

  if (!Number.isFinite(timestamp)) {
    throw new Error('Commercial Catalog asOf must be a valid date');
  }

  return timestamp;
}
