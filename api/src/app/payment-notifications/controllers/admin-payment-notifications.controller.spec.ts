import { readFileSync } from 'node:fs';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { BadRequestException, HttpStatus, RequestMethod } from '@nestjs/common';
import {
  GetPaymentNotificationByIdUseCase,
  ListPaymentNotificationsByCustomerUseCase,
  PaymentNotification,
  RejectPaymentNotificationUseCase,
  RequestChangesPaymentNotificationUseCase,
  StartReviewPaymentNotificationUseCase,
  ValidatePaymentNotificationUseCase,
} from '@nexus/modules/payment-notifications';
import { createAuthenticatedActor } from '@nexus/platform';

import { RolesGuard } from '../../../auth/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { AdminPaymentNotificationsController } from './admin-payment-notifications.controller';

const actor = createAuthenticatedActor({
  userId: 'administrator-1',
  customerId: null,
  roles: ['Nexus.Admin'],
  permissions: [],
  approvalGroupIds: [],
});

function createPaymentNotification(): PaymentNotification {
  return PaymentNotification.create({
    id: 'payment-notification-1',
    customerId: 'customer-1',
    paymentDate: new Date('2026-07-20T00:00:00.000Z'),
    amount: 125.5,
    currency: 'USD',
    bankReference: 'BANK-REFERENCE-1',
    invoiceIds: ['invoice-1'],
    createdAt: new Date('2026-07-21T10:00:00.000Z'),
    updatedAt: new Date('2026-07-21T10:00:00.000Z'),
  });
}

function createController() {
  const paymentNotification = createPaymentNotification();
  const getByIdUseCase = {
    execute: jest.fn().mockResolvedValue({ paymentNotification }),
  };
  const listByCustomerUseCase = {
    execute: jest.fn().mockResolvedValue({
      paymentNotifications: [paymentNotification],
    }),
  };
  const startReviewUseCase = {
    execute: jest.fn().mockResolvedValue({
      paymentNotification,
      pipelineResult: { internal: true },
    }),
  };
  const validateUseCase = {
    execute: jest.fn().mockResolvedValue({
      paymentNotification,
      pipelineResult: { internal: true },
    }),
  };
  const rejectUseCase = {
    execute: jest.fn().mockResolvedValue({
      paymentNotification,
      pipelineResult: { internal: true },
    }),
  };
  const requestChangesUseCase = {
    execute: jest.fn().mockResolvedValue({
      paymentNotification,
      pipelineResult: { internal: true },
    }),
  };

  return {
    controller: new AdminPaymentNotificationsController(
      getByIdUseCase as unknown as GetPaymentNotificationByIdUseCase,
      listByCustomerUseCase as unknown as ListPaymentNotificationsByCustomerUseCase,
      startReviewUseCase as unknown as StartReviewPaymentNotificationUseCase,
      validateUseCase as unknown as ValidatePaymentNotificationUseCase,
      rejectUseCase as unknown as RejectPaymentNotificationUseCase,
      requestChangesUseCase as unknown as RequestChangesPaymentNotificationUseCase,
    ),
    getByIdUseCase,
    listByCustomerUseCase,
    startReviewUseCase,
    validateUseCase,
    rejectUseCase,
    requestChangesUseCase,
    paymentNotification,
  };
}

describe('AdminPaymentNotificationsController', () => {
  it('declares only the approved authenticated administrative routes', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, AdminPaymentNotificationsController),
    ).toBe('admin/payment-notifications');
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AdminPaymentNotificationsController,
    ) as unknown[];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).not.toContain(RolesGuard);

    const routes = [
      ['listByCustomer', 'customer/:customerId', RequestMethod.GET],
      ['getById', ':id', RequestMethod.GET],
      ['startReview', ':id/start-review', RequestMethod.POST],
      ['validate', ':id/validate', RequestMethod.POST],
      ['reject', ':id/reject', RequestMethod.POST],
      ['requestChanges', ':id/request-changes', RequestMethod.POST],
    ] as const;

    for (const [method, path, requestMethod] of routes) {
      const handler = AdminPaymentNotificationsController.prototype[method];
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(requestMethod);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(
        HttpStatus.OK,
      );
    }
  });

  it('gets one administrative notification without customer matching in the controller', async () => {
    const { controller, getByIdUseCase } = createController();

    const response = await controller.getById(
      ' payment-notification-1 ',
      actor,
    );

    expect(getByIdUseCase.execute).toHaveBeenCalledTimes(1);
    expect(getByIdUseCase.execute).toHaveBeenCalledWith({
      actor,
      id: 'payment-notification-1',
    });
    expect(response).not.toHaveProperty('pipelineResult');
  });

  it('lists a normalized route customer with the actor', async () => {
    const { controller, listByCustomerUseCase } = createController();

    const response = await controller.listByCustomer(' customer-1 ', actor);

    expect(listByCustomerUseCase.execute).toHaveBeenCalledTimes(1);
    expect(listByCustomerUseCase.execute).toHaveBeenCalledWith({
      actor,
      customerId: 'customer-1',
    });
    expect(response).toHaveLength(1);
    expect(Object.isFrozen(response)).toBe(true);
  });

  it.each([
    ['startReview', 'startReviewUseCase'],
    ['validate', 'validateUseCase'],
    ['reject', 'rejectUseCase'],
    ['requestChanges', 'requestChangesUseCase'],
  ] as const)(
    'executes %s exactly once with actor and normalized id',
    async (method, key) => {
      const context = createController();

      const response = await context.controller[method](
        ' payment-notification-1 ',
        actor,
      );

      expect(context[key].execute).toHaveBeenCalledTimes(1);
      expect(context[key].execute).toHaveBeenCalledWith({
        actor,
        id: 'payment-notification-1',
      });
      expect(response).not.toHaveProperty('pipelineResult');
      expect(response).not.toHaveProperty('actor');
      expect(response).not.toBe(context.paymentNotification);
    },
  );

  it.each(['', '   '])('rejects an invalid id %j', async (id) => {
    const { controller, validateUseCase } = createController();

    await expect(controller.validate(id, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(validateUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects an empty route customer', async () => {
    const { controller, listByCustomerUseCase } = createController();

    await expect(
      controller.listByCustomer('   ', actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(listByCustomerUseCase.execute).not.toHaveBeenCalled();
  });

  it('propagates use-case errors unchanged', async () => {
    const { controller, rejectUseCase } = createController();
    const applicationError = new Error('Application failed');
    rejectUseCase.execute.mockRejectedValue(applicationError);

    await expect(
      controller.reject('payment-notification-1', actor),
    ).rejects.toBe(applicationError);
  });

  it('has no body, RolesGuard, manual permission, group, or bypass logic', () => {
    const source = readFileSync(__filename.replace('.spec.ts', '.ts'), 'utf8');

    expect(source).not.toMatch(/@Body|RolesGuard|actor\.roles|Nexus\.Admin/);
    expect(source).not.toMatch(
      /permissions|approvalGroupIds|effect\s*:\s*['"]allow['"]/,
    );
    expect(source).not.toMatch(/repository|Dataverse|@Query|@Headers/);
  });
});
