import 'reflect-metadata';
import { OrdersController } from './orders.controller';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';

describe('OrdersController', () => {
  it('declares exactly four authenticated routes', () => {
    expect(Reflect.getMetadata('path', OrdersController)).toBe('orders');
    expect(Reflect.getMetadata('__guards__', OrdersController)).toContain(
      JwtAuthGuard,
    );
    const methods = Object.getOwnPropertyNames(
      OrdersController.prototype,
    ).filter((name) => name !== 'constructor');
    expect(methods).toEqual(['create', 'replaceLines', 'list', 'get']);
  });
});
