import type { CatalogProductId } from '../../../domain';
import type { CatalogProductRecord } from '../common';

export interface CatalogProductGateway {
  findById(id: CatalogProductId): Promise<CatalogProductRecord | null>;

  findActive(): Promise<readonly CatalogProductRecord[]>;
}
