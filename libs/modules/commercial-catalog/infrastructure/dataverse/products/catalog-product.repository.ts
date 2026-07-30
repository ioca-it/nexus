import type {
  CatalogProduct,
  CatalogProductId,
  CatalogProductRepository,
} from '../../../domain';
import type { CatalogProductGateway } from './catalog-product.gateway';
import { toCatalogProduct } from './catalog-product.mapper';

export class DataverseCatalogProductRepository
  implements CatalogProductRepository
{
  constructor(private readonly gateway: CatalogProductGateway) {}

  async findById(id: CatalogProductId): Promise<CatalogProduct | null> {
    const record = await this.gateway.findById(id);

    return record === null ? null : toCatalogProduct(record);
  }

  async findActive(): Promise<readonly CatalogProduct[]> {
    const records = await this.gateway.findActive();

    return Object.freeze(records.map(toCatalogProduct));
  }
}
