import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type {
  GetPaymentNotificationByIdUseCase,
  ListPaymentNotificationsByCustomerUseCase,
  RejectPaymentNotificationUseCase,
  RequestChangesPaymentNotificationUseCase,
  StartReviewPaymentNotificationUseCase,
  ValidatePaymentNotificationUseCase,
} from '@nexus/modules/payment-notifications';
import type { AuthenticatedActor } from '@nexus/platform';

import { CurrentActor } from '../../../auth/decorators';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import type { PaymentNotificationResponse } from '../contracts';
import { toPaymentNotificationResponse } from '../mappers';
import {
  ADMIN_GET_PAYMENT_NOTIFICATION_BY_ID_USE_CASE,
  ADMIN_LIST_PAYMENT_NOTIFICATIONS_BY_CUSTOMER_USE_CASE,
  REJECT_PAYMENT_NOTIFICATION_USE_CASE,
  REQUEST_CHANGES_PAYMENT_NOTIFICATION_USE_CASE,
  START_REVIEW_PAYMENT_NOTIFICATION_USE_CASE,
  VALIDATE_PAYMENT_NOTIFICATION_USE_CASE,
} from '../payment-notifications.tokens';
import {
  normalizePaymentNotificationCustomerId,
  normalizePaymentNotificationId,
} from './payment-notification-route-parameters';

@Controller('admin/payment-notifications')
@UseGuards(JwtAuthGuard)
export class AdminPaymentNotificationsController {
  constructor(
    @Inject(ADMIN_GET_PAYMENT_NOTIFICATION_BY_ID_USE_CASE)
    private readonly getByIdUseCase: GetPaymentNotificationByIdUseCase,
    @Inject(ADMIN_LIST_PAYMENT_NOTIFICATIONS_BY_CUSTOMER_USE_CASE)
    private readonly listByCustomerUseCase: ListPaymentNotificationsByCustomerUseCase,
    @Inject(START_REVIEW_PAYMENT_NOTIFICATION_USE_CASE)
    private readonly startReviewUseCase: StartReviewPaymentNotificationUseCase,
    @Inject(VALIDATE_PAYMENT_NOTIFICATION_USE_CASE)
    private readonly validateUseCase: ValidatePaymentNotificationUseCase,
    @Inject(REJECT_PAYMENT_NOTIFICATION_USE_CASE)
    private readonly rejectUseCase: RejectPaymentNotificationUseCase,
    @Inject(REQUEST_CHANGES_PAYMENT_NOTIFICATION_USE_CASE)
    private readonly requestChangesUseCase: RequestChangesPaymentNotificationUseCase,
  ) {}

  @Get('customer/:customerId')
  @HttpCode(HttpStatus.OK)
  async listByCustomer(
    @Param('customerId') customerId: string,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<readonly PaymentNotificationResponse[]> {
    const { paymentNotifications } =
      await this.listByCustomerUseCase.execute({
        actor,
        customerId: normalizePaymentNotificationCustomerId(customerId),
      });

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

  @Post(':id/start-review')
  @HttpCode(HttpStatus.OK)
  async startReview(
    @Param('id') id: string,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<PaymentNotificationResponse> {
    const { paymentNotification } = await this.startReviewUseCase.execute({
      actor,
      id: normalizePaymentNotificationId(id),
    });

    return toPaymentNotificationResponse(paymentNotification);
  }

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  async validate(
    @Param('id') id: string,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<PaymentNotificationResponse> {
    const { paymentNotification } = await this.validateUseCase.execute({
      actor,
      id: normalizePaymentNotificationId(id),
    });

    return toPaymentNotificationResponse(paymentNotification);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<PaymentNotificationResponse> {
    const { paymentNotification } = await this.rejectUseCase.execute({
      actor,
      id: normalizePaymentNotificationId(id),
    });

    return toPaymentNotificationResponse(paymentNotification);
  }

  @Post(':id/request-changes')
  @HttpCode(HttpStatus.OK)
  async requestChanges(
    @Param('id') id: string,
    @CurrentActor() actor: AuthenticatedActor,
  ): Promise<PaymentNotificationResponse> {
    const { paymentNotification } =
      await this.requestChangesUseCase.execute({
        actor,
        id: normalizePaymentNotificationId(id),
      });

    return toPaymentNotificationResponse(paymentNotification);
  }
}
