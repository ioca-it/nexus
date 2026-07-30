declare const orderIdBrand: unique symbol;
declare const orderLineIdBrand: unique symbol;
declare const orderCustomerIdBrand: unique symbol;
declare const orderProductIdBrand: unique symbol;
declare const orderProductNumberBrand: unique symbol;

export type OrderId = string & {
  readonly [orderIdBrand]: 'OrderId';
};

export type OrderLineId = string & {
  readonly [orderLineIdBrand]: 'OrderLineId';
};

export type OrderCustomerId = string & {
  readonly [orderCustomerIdBrand]: 'OrderCustomerId';
};

export type OrderProductId = string & {
  readonly [orderProductIdBrand]: 'OrderProductId';
};

export type OrderProductNumber = string & {
  readonly [orderProductNumberBrand]: 'OrderProductNumber';
};

function createIdentifier<T extends string>(
  value: string,
  fieldName: string,
): T {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized as T;
}

export function createOrderId(value: string): OrderId {
  return createIdentifier<OrderId>(value, 'Order id');
}

export function createOrderLineId(value: string): OrderLineId {
  return createIdentifier<OrderLineId>(value, 'Order line id');
}

export function createOrderCustomerId(value: string): OrderCustomerId {
  return createIdentifier<OrderCustomerId>(value, 'Order customer id');
}

export function createOrderProductId(value: string): OrderProductId {
  return createIdentifier<OrderProductId>(value, 'Order product id');
}

export function createOrderProductNumber(value: string): OrderProductNumber {
  return createIdentifier<OrderProductNumber>(value, 'Order product number');
}
