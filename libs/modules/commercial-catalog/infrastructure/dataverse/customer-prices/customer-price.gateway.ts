import type { CatalogCustomerId, CatalogProductId } from '../../../domain';
import type { CustomerPriceRecord } from '../common';

export interface CustomerPriceGateway {
  findActiveByCustomerId(
    customerId: CatalogCustomerId,
    asOf: Date,
  ): Promise<readonly CustomerPriceRecord[]>;

  findActiveByCustomerAndProduct(
    customerId: CatalogCustomerId,
    productId: CatalogProductId,
    asOf: Date,
  ): Promise<CustomerPriceRecord | null>;
}
