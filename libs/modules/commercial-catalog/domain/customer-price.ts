import {
  createCatalogCustomerId,
  createCatalogPriceId,
  createCatalogProductId,
  type CatalogCustomerId,
  type CatalogPriceId,
  type CatalogProductId,
} from './catalog.types';

export interface CustomerPrice {
  readonly id: CatalogPriceId;
  readonly customerId: CatalogCustomerId;
  readonly productId: CatalogProductId;
  readonly currencyCode: string;
  readonly unitPrice: number;
  readonly minimumQuantity?: number;
  readonly validFrom?: Date;
  readonly validTo?: Date;
  readonly active: boolean;
}

export interface CreateCustomerPriceInput {
  readonly id: CatalogPriceId;
  readonly customerId: CatalogCustomerId;
  readonly productId: CatalogProductId;
  readonly currencyCode: string;
  readonly unitPrice: number;
  readonly minimumQuantity?: number;
  readonly validFrom?: Date;
  readonly validTo?: Date;
  readonly active: boolean;
}

function requiredString(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

function finiteNonNegative(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a finite non-negative number`);
  }

  return value;
}

function positiveFinite(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive finite number`);
  }

  return value;
}

function copyDate(value: Date, fieldName: string): Date {
  const copied = new Date(value.getTime());

  if (!Number.isFinite(copied.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return Object.freeze(copied);
}

export function createCustomerPrice(
  input: CreateCustomerPriceInput,
): CustomerPrice {
  if (typeof input.active !== 'boolean') {
    throw new Error('Customer price active must be boolean');
  }

  const minimumQuantity =
    input.minimumQuantity === undefined
      ? undefined
      : positiveFinite(input.minimumQuantity, 'Customer price minimumQuantity');
  const validFrom =
    input.validFrom === undefined
      ? undefined
      : copyDate(input.validFrom, 'Customer price validFrom');
  const validTo =
    input.validTo === undefined
      ? undefined
      : copyDate(input.validTo, 'Customer price validTo');

  if (
    validFrom !== undefined &&
    validTo !== undefined &&
    validTo.getTime() < validFrom.getTime()
  ) {
    throw new Error('Customer price validTo cannot precede validFrom');
  }

  return Object.freeze({
    id: createCatalogPriceId(input.id),
    customerId: createCatalogCustomerId(input.customerId),
    productId: createCatalogProductId(input.productId),
    currencyCode: requiredString(
      input.currencyCode,
      'Customer price currencyCode',
    ),
    unitPrice: finiteNonNegative(input.unitPrice, 'Customer price unitPrice'),
    ...(minimumQuantity === undefined ? {} : { minimumQuantity }),
    ...(validFrom === undefined ? {} : { validFrom }),
    ...(validTo === undefined ? {} : { validTo }),
    active: input.active,
  });
}
