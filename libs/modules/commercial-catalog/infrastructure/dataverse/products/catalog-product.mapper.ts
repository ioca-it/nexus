import {
  createCatalogProduct,
  createCatalogProductId,
  createCatalogProductNumber,
  type CatalogProduct,
} from '../../../domain';
import type { CatalogProductRecord } from '../common';

export function toCatalogProduct(record: CatalogProductRecord): CatalogProduct {
  return createCatalogProduct({
    id: createCatalogProductId(record.id),
    number: createCatalogProductNumber(record.number),
    name: record.name,
    description: record.description,
    categoryId: record.categoryId,
    imageReference: record.imageReference,
    unitOfMeasureCode: record.unitOfMeasureCode,
    ecommerceUrl: record.ecommerceUrl,
    active: record.active,
  });
}
