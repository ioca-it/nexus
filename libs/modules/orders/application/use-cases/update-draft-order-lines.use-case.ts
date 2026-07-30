import type { AuthenticatedActor } from '@nexus/platform';
import {
  ORDER_STATUS,
  createOrderLine,
  createOrderLineId,
  createOrderProductId,
  type Order,
  type OrderId,
  type OrderLine,
  type OrderLineId,
  type OrderProductId,
  type OrderRepository,
} from '../../domain';
import type {
  OrderCatalogItemSnapshot,
  OrderCatalogResolver,
} from '../catalog';
import type { OrderClock } from '../order-clock';
import { ORDERS_PERMISSION_ACTIONS } from '../security';
import { assertOrderAccess } from './order-use-case-access';

export interface UpdateDraftOrderLineInput {
  readonly id: OrderLineId;
  readonly productId: OrderProductId;
  readonly quantity: number;
}

export interface UpdateDraftOrderLinesRequest {
  readonly actor: AuthenticatedActor;
  readonly orderId: OrderId;
  readonly lines: readonly UpdateDraftOrderLineInput[];
}

export interface UpdateDraftOrderLinesDependencies {
  readonly repository: OrderRepository;
  readonly catalogResolver: OrderCatalogResolver;
  readonly clock: OrderClock;
}

interface NormalizedLineInput {
  readonly id: OrderLineId;
  readonly productId: OrderProductId;
  readonly quantity: number;
}

export class UpdateDraftOrderLinesUseCase {
  constructor(
    private readonly dependencies: UpdateDraftOrderLinesDependencies,
  ) {}

  async execute(request: UpdateDraftOrderLinesRequest): Promise<Order> {
    const order = await this.dependencies.repository.findById(request.orderId);

    if (order === null) {
      throw new Error('Order not found');
    }

    assertOrderAccess({
      actor: request.actor,
      action: ORDERS_PERMISSION_ACTIONS.UPDATE_DRAFT,
      resourceCustomerId: order.customerId,
    });

    if (order.status !== ORDER_STATUS.DRAFT) {
      throw new Error('Order lines can only be updated while DRAFT');
    }

    const normalizedInputs = normalizeUniqueLines(request.lines);

    // Opti ChatGPT: resolución única por producto para evitar consultas repetidas al catálogo.
    const snapshots = await Promise.all(
      normalizedInputs.map((line) =>
        this.dependencies.catalogResolver.resolveForCustomer(
          request.actor,
          line.productId,
        ),
      ),
    );
    const lines = normalizedInputs.map((line, index) =>
      createLineFromSnapshot(line, snapshots[index]),
    );

    for (const line of lines) {
      if (line.currencyCode !== order.currencyCode) {
        throw new Error('Catalog item currency does not match order currency');
      }
    }

    const updatedAt = this.dependencies.clock();
    const updatedOrder = order.replaceLines(lines, updatedAt);

    await this.dependencies.repository.update(updatedOrder);

    return updatedOrder;
  }
}

function normalizeUniqueLines(
  lines: readonly UpdateDraftOrderLineInput[],
): readonly NormalizedLineInput[] {
  const lineIds = new Set<OrderLineId>();
  const productIds = new Set<OrderProductId>();
  const normalized = lines.map((line) => {
    const id = createOrderLineId(line.id);
    const productId = createOrderProductId(line.productId);

    if (lineIds.has(id)) {
      throw new Error('Duplicate order line id');
    }

    if (productIds.has(productId)) {
      throw new Error('Duplicate order product id');
    }

    lineIds.add(id);
    productIds.add(productId);

    return Object.freeze({ id, productId, quantity: line.quantity });
  });

  return Object.freeze(normalized);
}

function createLineFromSnapshot(
  input: NormalizedLineInput,
  snapshot: OrderCatalogItemSnapshot | null | undefined,
): OrderLine {
  if (snapshot === null || snapshot === undefined) {
    throw new Error('Authorized catalog item not found');
  }

  if (snapshot.productId !== input.productId) {
    throw new Error('Catalog item product does not match requested product');
  }

  return createOrderLine({
    id: input.id,
    productId: snapshot.productId,
    productNumber: snapshot.productNumber,
    productName: snapshot.productName,
    quantity: input.quantity,
    unitOfMeasureCode: snapshot.unitOfMeasureCode,
    currencyCode: snapshot.currencyCode,
    unitPrice: snapshot.unitPrice,
  });
}
