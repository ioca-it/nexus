import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ORDERS_SNAPSHOT_FILES = [
  'domain/order.ts',
  'domain/order-line.ts',
  'domain/repositories/order.repository.ts',
  'application/catalog/order-catalog-resolver.ts',
  'application/use-cases/create-draft-order.use-case.ts',
  'application/use-cases/update-draft-order-lines.use-case.ts',
  'application/use-cases/get-order-by-id.use-case.ts',
  'application/use-cases/list-customer-orders.use-case.ts',
] as const;

describe('Commercial Catalog ecommerce separation from Orders', () => {
  it.each(ORDERS_SNAPSHOT_FILES)('keeps ecommerceUrl out of %s', (fileName) => {
    const source = readFileSync(
      join(__dirname, '..', '..', 'orders', fileName),
      'utf8',
    );

    expect(source).not.toMatch(/ecommerceUrl/);
  });
});
