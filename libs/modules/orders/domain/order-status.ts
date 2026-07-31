export const ORDER_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  REJECTED: 'REJECTED',
  APPROVED: 'APPROVED',
} as const);

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
