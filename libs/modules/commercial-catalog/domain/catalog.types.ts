declare const catalogProductIdBrand: unique symbol;
declare const catalogProductNumberBrand: unique symbol;
declare const catalogCustomerIdBrand: unique symbol;
declare const catalogPriceIdBrand: unique symbol;

export type CatalogProductId = string & {
  readonly [catalogProductIdBrand]: 'CatalogProductId';
};

export type CatalogProductNumber = string & {
  readonly [catalogProductNumberBrand]: 'CatalogProductNumber';
};

export type CatalogCustomerId = string & {
  readonly [catalogCustomerIdBrand]: 'CatalogCustomerId';
};

export type CatalogPriceId = string & {
  readonly [catalogPriceIdBrand]: 'CatalogPriceId';
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

export function createCatalogProductId(value: string): CatalogProductId {
  return createIdentifier<CatalogProductId>(value, 'Catalog product id');
}

export function createCatalogProductNumber(
  value: string,
): CatalogProductNumber {
  return createIdentifier<CatalogProductNumber>(
    value,
    'Catalog product number',
  );
}

export function createCatalogCustomerId(value: string): CatalogCustomerId {
  return createIdentifier<CatalogCustomerId>(value, 'Catalog customer id');
}

export function createCatalogPriceId(value: string): CatalogPriceId {
  return createIdentifier<CatalogPriceId>(value, 'Catalog price id');
}
