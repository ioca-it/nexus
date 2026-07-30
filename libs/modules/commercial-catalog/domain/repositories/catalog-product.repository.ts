import type { CatalogProductId } from '../catalog.types';
import type { CatalogProduct } from '../product';

export interface CatalogProductRepository {
  findById(id: CatalogProductId): Promise<CatalogProduct | null>;

  findActive(): Promise<readonly CatalogProduct[]>;
}
