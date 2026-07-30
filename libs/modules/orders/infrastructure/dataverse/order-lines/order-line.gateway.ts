import type {
  OrderLineQuery,
  OrderLineRecord,
} from '../common/orders-dataverse.types';
export interface OrderLineGateway {
  findOne(id: string): Promise<OrderLineRecord | null>;
  query(query: OrderLineQuery): Promise<readonly OrderLineRecord[]>;
  create(record: OrderLineRecord): Promise<void>;
  update(record: OrderLineRecord): Promise<void>;
}
