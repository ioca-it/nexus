import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type {
  CreateDraftPaymentNotificationUseCase,
  GetPaymentNotificationByIdUseCase,
  ListCustomerPaymentNotificationsUseCase,
  ResubmitPaymentNotificationUseCase,
  SubmitPaymentNotificationUseCase,
  UpdatePaymentNotificationUseCase,
} from '@nexus/modules/payment-notifications';
import type { AuthenticatedActor } from '@nexus/platform';

import { CurrentActor } from '../../../auth/decorators';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import {
  CreatePaymentNotificationDto,
  type PaymentNotificationResponse,
  UpdatePaymentNotificationDto,
} from '../contracts';
import { toPaymentNotificationResponse } from '../mappers';
import {
  CREATE_DRAFT_PAYMENT_NOTIFICATION_USE_CASE,
  GET_PAYMENT_NOTIFICATION_BY_ID_USE_CASE,
  LIST_CUSTOMER_PAYMENT_NOTIFICATIONS_USE_CASE,
  PAYMENT_NOTIFICATION_ID_GENERATOR,
  RESUBMIT_PAYMENT_NOTIFICATION_USE_CASE,
  SUBMIT_PAYMENT_NOTIFICATION_USE_CASE,
  UPDATE_PAYMENT_NOTIFICATION_USE_CASE,
  type PaymentNotificationIdGenerator,
} from '../payment-notifications.tokens';
import { normalizePaymentNotificationId } from './payment-notification-route-parameters';

@Controller('payment-notifications')
@UseGuards(JwtAuthGuard)
export class PaymentNotificationsController {
  constructor(
    @Inject(GET_PAYMENT_NOTIFICATION_BY_ID_USE_CASE)
    private readonly getByIdUseCase: GetPaymentNotificationByIdUseCase,
    @Inject(LIST_CUSTOMER_PAYMENT_NOTIFICATIONS_USE_CASE)
    private readonly listUseCase: ListCustomerPaymentNotificationsUseCase,
    @Inject(CREATE_DRAFT_PAYMENT_NOTIFICATION_USE_CASE)
    private readonly createDraftUseCase: CreateDraftPaymentNotificationUseCase,
    @Inject(UPDATE_PAYMENT_NOTIFICATION_USE_CASE)
    private readonly updateUseCase: UpdatePaymentNotificationUseCase,
    @Inject(SUBMIT_PAYMENT_NOTIFICATION_USE_CASE)
    private readonly submitUseCase: SubmitPaymentNotificationUseCase,
    @Inject(RESUBMIT_PAYMENT_NOTIFICATION_USE_CASE)
    private readonly resubmitUseCase: ResubmitPaymentNotificationUseCase,
    @Inject(PAYMENT_NOTIFICATION_ID_GENERATOR)
    private readonly idGenerator: PaymentNotificationIdGenerator,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<readonly PaymentNotificationResponse[]> {
    const { paymentNotifications } = await this.listUseCase.execute({ actor });

    return Object.freeze(
      paymentNotifications.map(toPaymentNotificationResponse),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(
    @Param('id') id: string,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<PaymentNotificationResponse> {
    const { paymentNotification } = await this.getByIdUseCase.execute({
      actor,
      id: normalizePaymentNotificationId(id),
    });

    return toPaymentNotificationResponse(paymentNotification);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: CreatePaymentNotificationDto,
  ): Promise<PaymentNotificationResponse> {
    const { paymentNotification } = await this.createDraftUseCase.execute({
      actor,
      id: this.idGenerator(),
      paymentDate: new Date(dto.paymentDate),
      amount: dto.amount,
      currency: dto.currency,
      bankReference: dto.bankReference,
      receiptFileId: dto.receiptFileId,
      invoiceIds: dto.invoiceIds,
    });

    return toPaymentNotificationResponse(paymentNotification);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @CurrentActor() actor: AuthenticatedActor,
    @Body() dto: UpdatePaymentNotificationDto,
  ): Promise<PaymentNotificationResponse> {
    const { paymentNotification } = await this.updateUseCase.execute({
      actor,
      id: normalizePaymentNotificationId(id),
      paymentDate: new Date(dto.paymentDate),
      amount: dto.amount,
      currency: dto.currency,
      bankReference: dto.bankReference,
      receiptFileId: dto.receiptFileId,
      invoiceIds: dto.invoiceIds,
    });

    return toPaymentNotificationResponse(paymentNotification);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  async submit(
    @Param('id') id: string,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<PaymentNotificationResponse> {
    const { paymentNotification } = await this.submitUseCase.execute({
      actor,
      id: normalizePaymentNotificationId(id),
    });

    return toPaymentNotificationResponse(paymentNotification);
  }

  @Post(':id/resubmit')
  @HttpCode(HttpStatus.OK)
  async resubmit(
    @Param('id') id: string,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<PaymentNotificationResponse> {
    const { paymentNotification } = await this.resubmitUseCase.execute({
      actor,
      id: normalizePaymentNotificationId(id),
    });

    return toPaymentNotificationResponse(paymentNotification);
  }
}
