import type { OrderLine } from '../../../domain/order-line';
import type { Order } from '../../../domain/order';

export interface OrderRecord {
  readonly id: string;
  readonly customerId: string;
  readonly status: string;
  readonly currencyCode: string;
  readonly subtotal: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrderLineRecord {
  readonly id: string;
  readonly orderId: string;
  readonly productId: string;
  readonly productNumber: string;
  readonly productName: string;
  readonly unitOfMeasureCode?: string;
  readonly currencyCode: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly lineSubtotal: number;
}

export interface DataverseOrderSchema {
  readonly entitySet: string;
  readonly fields: Readonly<{
    readonly id: string;
    readonly customerId: string;
    readonly status: string;
    readonly currencyCode: string;
    readonly subtotal: string;
    readonly createdAt: string;
    readonly updatedAt: string;
  }>;
}

export interface DataverseOrderLineSchema {
  readonly entitySet: string;
  readonly fields: Readonly<{
    readonly id: string;
    readonly orderId: string;
    readonly productId: string;
    readonly productNumber: string;
    readonly productName: string;
    readonly unitOfMeasureCode: string;
    readonly currencyCode: string;
    readonly quantity: string;
    readonly unitPrice: string;
    readonly lineSubtotal: string;
  }>;
}

export interface DataverseOrdersSchema {
  readonly order: DataverseOrderSchema;
  readonly orderLine: DataverseOrderLineSchema;
}

export interface OrdersDataverseClient {
  findOne(
    entitySet: string,
    id: string,
  ): Promise<Readonly<Record<string, unknown>> | null>;
  query(
    entitySet: string,
    filter: Readonly<Record<string, unknown>>,
  ): Promise<readonly Readonly<Record<string, unknown>>[]>;
  create(
    entitySet: string,
    record: Readonly<Record<string, unknown>>,
  ): Promise<void>;
  update(
    entitySet: string,
    id: string,
    record: Readonly<Record<string, unknown>>,
  ): Promise<void>;
}

export interface OrderQuery {
  readonly customerId?: string;
}
export interface OrderLineQuery {
  readonly orderId?: string;
}

export type OrderLike = Order;
export type OrderLineLike = OrderLine;
