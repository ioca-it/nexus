import {
  createCatalogCustomerId,
  createCatalogPriceId,
  createCatalogProductId,
  createCustomerPrice,
  type CustomerPrice,
} from '../../../domain';
import type { CustomerPriceRecord } from '../common';

export function toCustomerPrice(record: CustomerPriceRecord): CustomerPrice {
  return createCustomerPrice({
    id: createCatalogPriceId(record.id),
    customerId: createCatalogCustomerId(record.customerId),
    productId: createCatalogProductId(record.productId),
    currencyCode: record.currencyCode,
    unitPrice: record.unitPrice,
    minimumQuantity: record.minimumQuantity,
    validFrom:
      record.validFrom === undefined ? undefined : new Date(record.validFrom),
    validTo:
      record.validTo === undefined ? undefined : new Date(record.validTo),
    active: record.active,
  });
}
