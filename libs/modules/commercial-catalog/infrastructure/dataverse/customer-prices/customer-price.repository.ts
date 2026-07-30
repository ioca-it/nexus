import type {
  CatalogCustomerId,
  CatalogProductId,
  CustomerPrice,
  CustomerPriceRepository,
} from '../../../domain';
import type { CustomerPriceGateway } from './customer-price.gateway';
import { toCustomerPrice } from './customer-price.mapper';

export class DataverseCustomerPriceRepository
  implements CustomerPriceRepository
{
  constructor(private readonly gateway: CustomerPriceGateway) {}

  async findActiveByCustomerId(
    customerId: CatalogCustomerId,
    asOf: Date,
  ): Promise<readonly CustomerPrice[]> {
    const records = await this.gateway.findActiveByCustomerId(customerId, asOf);

    return Object.freeze(records.map(toCustomerPrice));
  }

  async findActiveByCustomerAndProduct(
    customerId: CatalogCustomerId,
    productId: CatalogProductId,
    asOf: Date,
  ): Promise<CustomerPrice | null> {
    const record = await this.gateway.findActiveByCustomerAndProduct(
      customerId,
      productId,
      asOf,
    );

    return record === null ? null : toCustomerPrice(record);
  }
}
