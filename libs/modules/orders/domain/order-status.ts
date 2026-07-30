export const ORDER_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
} as const);

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
