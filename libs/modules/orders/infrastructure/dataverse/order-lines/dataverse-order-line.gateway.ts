import type {
  DataverseOrderLineSchema,
  OrderLineQuery,
  OrderLineRecord,
  OrdersDataverseClient,
} from '../common/orders-dataverse.types';
import type { OrderLineGateway } from './order-line.gateway';
import { validateOrderLineRecord } from '../common/orders-dataverse.validators';

export class DataverseOrderLineGateway implements OrderLineGateway {
  constructor(
    private readonly client: OrdersDataverseClient,
    private readonly schema: DataverseOrderLineSchema,
  ) {
    Object.freeze(this);
  }
  async findOne(id: string): Promise<OrderLineRecord | null> {
    const raw = await this.client.findOne(this.schema.entitySet, id);
    return raw === null ? null : this.fromPhysical(raw);
  }
  async query(query: OrderLineQuery): Promise<readonly OrderLineRecord[]> {
    const filter =
      query.orderId === undefined
        ? {}
        : { [this.schema.fields.orderId]: query.orderId };
    return Object.freeze(
      (await this.client.query(this.schema.entitySet, filter)).map((record) =>
        this.fromPhysical(record),
      ),
    );
  }
  async create(record: OrderLineRecord): Promise<void> {
    await this.client.create(this.schema.entitySet, this.toPhysical(record));
  }
  async update(record: OrderLineRecord): Promise<void> {
    await this.client.update(
      this.schema.entitySet,
      record.id,
      this.toPhysical(record),
    );
  }
  private fromPhysical(
    raw: Readonly<Record<string, unknown>>,
  ): OrderLineRecord {
    const f = this.schema.fields;
    const unit = raw[f.unitOfMeasureCode];
    return validateOrderLineRecord({
      id: String(raw[f.id] ?? ''),
      orderId: String(raw[f.orderId] ?? ''),
      productId: String(raw[f.productId] ?? ''),
      productNumber: String(raw[f.productNumber] ?? ''),
      productName: String(raw[f.productName] ?? ''),
      ...(unit === undefined || unit === null || String(unit).trim() === ''
        ? {}
        : { unitOfMeasureCode: String(unit) }),
      currencyCode: String(raw[f.currencyCode] ?? ''),
      quantity: Number(raw[f.quantity]),
      unitPrice: Number(raw[f.unitPrice]),
      lineSubtotal: Number(raw[f.lineSubtotal]),
    });
  }
  private toPhysical(
    record: OrderLineRecord,
  ): Readonly<Record<string, unknown>> {
    const value = validateOrderLineRecord(record);
    const f = this.schema.fields;
    return Object.freeze({
      [f.id]: value.id,
      [f.orderId]: value.orderId,
      [f.productId]: value.productId,
      [f.productNumber]: value.productNumber,
      [f.productName]: value.productName,
      ...(value.unitOfMeasureCode === undefined
        ? {}
        : { [f.unitOfMeasureCode]: value.unitOfMeasureCode }),
      [f.currencyCode]: value.currencyCode,
      [f.quantity]: value.quantity,
      [f.unitPrice]: value.unitPrice,
      [f.lineSubtotal]: value.lineSubtotal,
    });
  }
}
