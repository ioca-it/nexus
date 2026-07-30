import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedActor } from '@nexus/platform';
import {
  CreateDraftOrderUseCase,
  UpdateDraftOrderLinesUseCase,
  GetOrderByIdUseCase,
  ListCustomerOrdersUseCase,
} from '@nexus/modules/orders';
import { CurrentActor } from '../../../auth/decorators';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import {
  CreateDraftOrderDto,
  UpdateDraftOrderLinesDto,
  type OrderResponse,
} from '../contracts';
import { toOrderResponse } from '../mappers';
import {
  normalizeOrderId,
  normalizeOrderLineId,
  normalizeOrderProductId,
} from '../params/order-parameter.normalizer';
import {
  CREATE_DRAFT_ORDER_USE_CASE,
  UPDATE_DRAFT_ORDER_LINES_USE_CASE,
  GET_ORDER_BY_ID_USE_CASE,
  LIST_CUSTOMER_ORDERS_USE_CASE,
  ORDER_ID_GENERATOR,
  type OrderIdGenerator,
} from '../orders.tokens';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    @Inject(CREATE_DRAFT_ORDER_USE_CASE)
    private readonly createUseCase: CreateDraftOrderUseCase,
    @Inject(UPDATE_DRAFT_ORDER_LINES_USE_CASE)
    private readonly updateUseCase: UpdateDraftOrderLinesUseCase,
    @Inject(GET_ORDER_BY_ID_USE_CASE)
    private readonly getUseCase: GetOrderByIdUseCase,
    @Inject(LIST_CUSTOMER_ORDERS_USE_CASE)
    private readonly listUseCase: ListCustomerOrdersUseCase,
    @Inject(ORDER_ID_GENERATOR) private readonly idGenerator: OrderIdGenerator,
  ) {}
  @Post() @HttpCode(HttpStatus.CREATED) async create(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: CreateDraftOrderDto,
  ): Promise<OrderResponse> {
    return toOrderResponse(
      await this.createUseCase.execute({
        actor,
        id: this.idGenerator() as never,
        currencyCode: dto.currencyCode.trim(),
      }),
    );
  }
  @Put(':orderId/lines') @HttpCode(HttpStatus.OK) async replaceLines(
    @Param('orderId') orderId: string,
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: UpdateDraftOrderLinesDto,
  ): Promise<OrderResponse> {
    const lines = Object.freeze(
      dto.lines.map((line) =>
        Object.freeze({
          id: normalizeOrderLineId(line.id) as never,
          productId: normalizeOrderProductId(line.productId) as never,
          quantity: line.quantity,
        }),
      ),
    );
    return toOrderResponse(
      await this.updateUseCase.execute({
        actor,
        orderId: normalizeOrderId(orderId) as never,
        lines,
      }),
    );
  }
  @Get() @HttpCode(HttpStatus.OK) async list(
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<readonly OrderResponse[]> {
    return Object.freeze(
      (await this.listUseCase.execute({ actor })).map(toOrderResponse),
    );
  }
  @Get(':orderId') @HttpCode(HttpStatus.OK) async get(
    @Param('orderId') orderId: string,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<OrderResponse> {
    const order = await this.getUseCase.execute({
      actor,
      id: normalizeOrderId(orderId) as never,
    });
    if (order === null) throw new NotFoundException('Order not found');
    return toOrderResponse(order);
  }
}
