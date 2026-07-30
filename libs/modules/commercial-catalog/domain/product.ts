import {
  createCatalogProductId,
  createCatalogProductNumber,
  type CatalogProductId,
  type CatalogProductNumber,
} from './catalog.types';
import { validateSafeEcommerceUrl } from './safe-ecommerce-url';

export interface CatalogProduct {
  readonly id: CatalogProductId;
  readonly number: CatalogProductNumber;
  readonly name: string;
  readonly description?: string;
  readonly categoryId?: string;
  readonly imageReference?: string;
  readonly unitOfMeasureCode?: string;
  readonly ecommerceUrl?: string;
  readonly active: boolean;
}

export interface CreateCatalogProductInput {
  readonly id: CatalogProductId;
  readonly number: CatalogProductNumber;
  readonly name: string;
  readonly description?: string;
  readonly categoryId?: string;
  readonly imageReference?: string;
  readonly unitOfMeasureCode?: string;
  readonly ecommerceUrl?: string;
  readonly active: boolean;
}

function requiredString(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

function optionalString(value: string | undefined): string | undefined {
  return value === undefined ? undefined : value.trim();
}

export function createCatalogProduct(
  input: CreateCatalogProductInput,
): CatalogProduct {
  if (typeof input.active !== 'boolean') {
    throw new Error('Catalog product active must be boolean');
  }

  const description = optionalString(input.description);
  const categoryId = optionalString(input.categoryId);
  const imageReference = optionalString(input.imageReference);
  const unitOfMeasureCode = optionalString(input.unitOfMeasureCode);
  const ecommerceUrl =
    input.ecommerceUrl === undefined
      ? undefined
      : validateSafeEcommerceUrl(input.ecommerceUrl);

  return Object.freeze({
    id: createCatalogProductId(input.id),
    number: createCatalogProductNumber(input.number),
    name: requiredString(input.name, 'Catalog product name'),
    ...(description === undefined ? {} : { description }),
    ...(categoryId === undefined ? {} : { categoryId }),
    ...(imageReference === undefined ? {} : { imageReference }),
    ...(unitOfMeasureCode === undefined ? {} : { unitOfMeasureCode }),
    ...(ecommerceUrl === undefined ? {} : { ecommerceUrl }),
    active: input.active,
  });
}
