import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import type {
  GetCustomerCatalogItemUseCase,
  ListCustomerCatalogUseCase,
} from '@nexus/modules/commercial-catalog';
import type { AuthenticatedActor } from '@nexus/platform';

import { CurrentActor } from '../../../auth/decorators';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import type { CatalogItemResponse } from '../contracts';
import { toCatalogItemResponse } from '../mappers';
import {
  GET_CUSTOMER_CATALOG_ITEM_USE_CASE,
  LIST_CUSTOMER_CATALOG_USE_CASE,
} from '../commercial-catalog.tokens';
import { normalizeCommercialCatalogProductId } from './commercial-catalog-route-parameters';

@Controller('commercial-catalog')
@UseGuards(JwtAuthGuard)
export class CommercialCatalogController {
  constructor(
    @Inject(LIST_CUSTOMER_CATALOG_USE_CASE)
    private readonly listCustomerCatalogUseCase: ListCustomerCatalogUseCase,
    @Inject(GET_CUSTOMER_CATALOG_ITEM_USE_CASE)
    private readonly getCustomerCatalogItemUseCase: GetCustomerCatalogItemUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async listCatalog(
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<readonly CatalogItemResponse[]> {
    const items = await this.listCustomerCatalogUseCase.execute({ actor });

    return Object.freeze(items.map(toCatalogItemResponse));
  }

  @Get('products/:productId')
  @HttpCode(HttpStatus.OK)
  async getProduct(
    @Param('productId') productId: string,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<CatalogItemResponse> {
    const item = await this.getCustomerCatalogItemUseCase.execute({
      actor,
      productId: normalizeCommercialCatalogProductId(productId),
    });

    if (item === null) {
      throw new NotFoundException('Commercial Catalog product was not found.');
    }

    return toCatalogItemResponse(item);
  }
}
