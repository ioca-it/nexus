export type {
  OrderActionApprovalConfig,
  OrdersApprovalConfig,
  OrdersConfig,
} from './orders-config.types';
export { loadOrdersConfig } from './orders-config.loader';
export {
  REQUIRED_ORDERS_APPROVAL_ENVIRONMENT_VARIABLES,
  validateOrdersApprovalEnvironment,
} from './orders-config.validator';
