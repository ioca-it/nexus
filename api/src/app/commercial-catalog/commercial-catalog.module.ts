import { Module } from '@nestjs/common';

import { DataverseModule } from '../dataverse';
import { CommercialCatalogController } from './controllers';
import { COMMERCIAL_CATALOG_PROVIDERS } from './commercial-catalog.providers';
import {
  GET_CUSTOMER_CATALOG_ITEM_USE_CASE,
  LIST_CUSTOMER_CATALOG_USE_CASE,
} from './commercial-catalog.tokens';

@Module({
  imports: [DataverseModule],
  controllers: [CommercialCatalogController],
  providers: COMMERCIAL_CATALOG_PROVIDERS,
  exports: [LIST_CUSTOMER_CATALOG_USE_CASE, GET_CUSTOMER_CATALOG_ITEM_USE_CASE],
})
export class CommercialCatalogModule {}
