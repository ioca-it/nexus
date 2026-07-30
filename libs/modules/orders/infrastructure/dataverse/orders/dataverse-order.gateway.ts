import type {
  DataverseOrderSchema,
  OrderQuery,
  OrderRecord,
  OrdersDataverseClient,
} from '../common/orders-dataverse.types';
import { validateOrderRecord } from '../common/orders-dataverse.validators';
import type { OrderGateway } from './order.gateway';

export class DataverseOrderGateway implements OrderGateway {
  constructor(
    private readonly client: OrdersDataverseClient,
    private readonly schema: DataverseOrderSchema,
  ) {
    Object.freeze(this);
  }
  async findOne(id: string): Promise<OrderRecord | null> {
    const raw = await this.client.findOne(this.schema.entitySet, id);
    return raw === null ? null : this.fromPhysical(raw);
  }
  async query(query: OrderQuery): Promise<readonly OrderRecord[]> {
    const filter =
      query.customerId === undefined
        ? {}
        : { [this.schema.fields.customerId]: query.customerId };
    return Object.freeze(
      (await this.client.query(this.schema.entitySet, filter)).map((record) =>
        this.fromPhysical(record),
      ),
    );
  }
  async create(record: OrderRecord): Promise<void> {
    await this.client.create(this.schema.entitySet, this.toPhysical(record));
  }
  async update(record: OrderRecord): Promise<void> {
    await this.client.update(
      this.schema.entitySet,
      record.id,
      this.toPhysical(record),
    );
  }
  private fromPhysical(raw: Readonly<Record<string, unknown>>): OrderRecord {
    const f = this.schema.fields;
    return validateOrderRecord({
      id: String(raw[f.id] ?? ''),
      customerId: String(raw[f.customerId] ?? ''),
      status: String(raw[f.status] ?? ''),
      currencyCode: String(raw[f.currencyCode] ?? ''),
      subtotal: Number(raw[f.subtotal]),
      createdAt: String(raw[f.createdAt] ?? ''),
      updatedAt: String(raw[f.updatedAt] ?? ''),
    });
  }
  private toPhysical(record: OrderRecord): Readonly<Record<string, unknown>> {
    const value = validateOrderRecord(record);
    const f = this.schema.fields;
    return Object.freeze({
      [f.id]: value.id,
      [f.customerId]: value.customerId,
      [f.status]: value.status,
      [f.currencyCode]: value.currencyCode,
      [f.subtotal]: value.subtotal,
      [f.createdAt]: value.createdAt,
      [f.updatedAt]: value.updatedAt,
    });
  }
}
