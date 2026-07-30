import { ORDERS_PROVIDERS } from './orders.providers';
import { OrdersModule } from './orders.module';
import {
  CREATE_DRAFT_ORDER_USE_CASE,
  UPDATE_DRAFT_ORDER_LINES_USE_CASE,
  GET_ORDER_BY_ID_USE_CASE,
  LIST_CUSTOMER_ORDERS_USE_CASE,
  ORDERS_DATAVERSE_CLIENT,
  ORDERS_CLOCK,
} from './orders.tokens';

describe('Orders composition', () => {
  it('defines symbol tokens and providers without constructing them', () => {
    for (const token of [
      ORDERS_DATAVERSE_CLIENT,
      ORDERS_CLOCK,
      CREATE_DRAFT_ORDER_USE_CASE,
      UPDATE_DRAFT_ORDER_LINES_USE_CASE,
      GET_ORDER_BY_ID_USE_CASE,
      LIST_CUSTOMER_ORDERS_USE_CASE,
    ])
      expect(typeof token).toBe('symbol');
    expect(ORDERS_PROVIDERS).toHaveLength(11);
    expect(Reflect.getMetadata('imports', OrdersModule)).toHaveLength(2);
    expect(Reflect.getMetadata('controllers', OrdersModule)).toHaveLength(1);
  });
});
