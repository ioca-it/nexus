import type {
  CatalogItem,
  CatalogProduct,
  CustomerPrice,
} from '@nexus/modules/commercial-catalog';

import type {
  CatalogItemResponse,
  CatalogProductResponse,
  CustomerPriceResponse,
} from '../contracts';

export function toCatalogProductResponse(
  product: CatalogProduct,
): CatalogProductResponse {
  return Object.freeze({
    id: product.id,
    number: product.number,
    name: product.name,
    ...(product.description === undefined
      ? {}
      : { description: product.description }),
    ...(product.categoryId === undefined
      ? {}
      : { categoryId: product.categoryId }),
    ...(product.imageReference === undefined
      ? {}
      : { imageReference: product.imageReference }),
    ...(product.unitOfMeasureCode === undefined
      ? {}
      : { unitOfMeasureCode: product.unitOfMeasureCode }),
  });
}

export function toCustomerPriceResponse(
  price: CustomerPrice,
): CustomerPriceResponse {
  return Object.freeze({
    currencyCode: price.currencyCode,
    unitPrice: price.unitPrice,
    ...(price.minimumQuantity === undefined
      ? {}
      : { minimumQuantity: price.minimumQuantity }),
    ...(price.validFrom === undefined
      ? {}
      : { validFrom: price.validFrom.toISOString() }),
    ...(price.validTo === undefined
      ? {}
      : { validTo: price.validTo.toISOString() }),
  });
}

export function toCatalogItemResponse(item: CatalogItem): CatalogItemResponse {
  return Object.freeze({
    product: toCatalogProductResponse(item.product),
    price: toCustomerPriceResponse(item.price),
  });
}
