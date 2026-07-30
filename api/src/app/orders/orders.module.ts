import { Module } from '@nestjs/common';
import { DataverseModule } from '../dataverse';
import { CommercialCatalogModule } from '../commercial-catalog';
import { ORDERS_PROVIDERS } from './orders.providers';
import { OrdersController } from './controllers';
import {
  CREATE_DRAFT_ORDER_USE_CASE,
  UPDATE_DRAFT_ORDER_LINES_USE_CASE,
  GET_ORDER_BY_ID_USE_CASE,
  LIST_CUSTOMER_ORDERS_USE_CASE,
} from './orders.tokens';

@Module({
  imports: [DataverseModule, CommercialCatalogModule],
  controllers: [OrdersController],
  providers: ORDERS_PROVIDERS,
  exports: [
    CREATE_DRAFT_ORDER_USE_CASE,
    UPDATE_DRAFT_ORDER_LINES_USE_CASE,
    GET_ORDER_BY_ID_USE_CASE,
    LIST_CUSTOMER_ORDERS_USE_CASE,
  ],
})
export class OrdersModule {}
