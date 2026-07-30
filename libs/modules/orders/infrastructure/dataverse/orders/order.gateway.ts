import type { OrderRecord, OrderQuery } from '../common/orders-dataverse.types';

export interface OrderGateway {
  findOne(id: string): Promise<OrderRecord | null>;
  query(query: OrderQuery): Promise<readonly OrderRecord[]>;
  create(record: OrderRecord): Promise<void>;
  update(record: OrderRecord): Promise<void>;
}
