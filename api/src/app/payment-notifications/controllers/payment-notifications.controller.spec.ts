import { readFileSync } from 'node:fs';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { BadRequestException, HttpStatus, RequestMethod } from '@nestjs/common';
import {
  CreateDraftPaymentNotificationUseCase,
  GetPaymentNotificationByIdUseCase,
  ListCustomerPaymentNotificationsUseCase,
  PaymentNotification,
  ResubmitPaymentNotificationUseCase,
  SubmitPaymentNotificationUseCase,
  UpdatePaymentNotificationUseCase,
} from '@nexus/modules/payment-notifications';
import { createAuthenticatedActor } from '@nexus/platform';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import type {
  CreatePaymentNotificationDto,
  UpdatePaymentNotificationDto,
} from '../contracts';
import { PaymentNotificationsController } from './payment-notifications.controller';

const actor = createAuthenticatedActor({
  userId: 'actor-1',
  customerId: 'customer-1',
  roles: [],
  permissions: [],
  approvalGroupIds: [],
});

function createPaymentNotification(): PaymentNotification {
  return PaymentNotification.create({
    id: 'generated-id',
    customerId: 'customer-1',
    paymentDate: new Date('2026-07-20T00:00:00.000Z'),
    amount: 125.5,
    currency: 'USD',
    bankReference: 'BANK-REFERENCE-1',
    receiptFileId: 'receipt-file-1',
    invoiceIds: ['invoice-1'],
    createdAt: new Date('2026-07-21T10:00:00.000Z'),
    updatedAt: new Date('2026-07-21T10:00:00.000Z'),
  });
}

const dto: CreatePaymentNotificationDto = {
  paymentDate: '2026-07-20T00:00:00.000Z',
  amount: 125.5,
  currency: 'USD',
  bankReference: 'BANK-REFERENCE-1',
  receiptFileId: 'receipt-file-1',
  invoiceIds: ['invoice-1'],
};

function createController() {
  const paymentNotification = createPaymentNotification();
  const getByIdUseCase = {
    execute: jest.fn().mockResolvedValue({ paymentNotification }),
  };
  const listUseCase = {
    execute: jest.fn().mockResolvedValue({
      paymentNotifications: [paymentNotification],
    }),
  };
  const createDraftUseCase = {
    execute: jest.fn().mockResolvedValue({ paymentNotification }),
  };
  const updateUseCase = {
    execute: jest.fn().mockResolvedValue({ paymentNotification }),
  };
  const submitUseCase = {
    execute: jest.fn().mockResolvedValue({
      paymentNotification,
      pipelineResult: { internal: true },
    }),
  };
  const resubmitUseCase = {
    execute: jest.fn().mockResolvedValue({
      paymentNotification,
      pipelineResult: { internal: true },
    }),
  };
  const idGenerator = jest.fn(() => 'generated-id');

  return {
    controller: new PaymentNotificationsController(
      getByIdUseCase as unknown as GetPaymentNotificationByIdUseCase,
      listUseCase as unknown as ListCustomerPaymentNotificationsUseCase,
      createDraftUseCase as unknown as CreateDraftPaymentNotificationUseCase,
      updateUseCase as unknown as UpdatePaymentNotificationUseCase,
      submitUseCase as unknown as SubmitPaymentNotificationUseCase,
      resubmitUseCase as unknown as ResubmitPaymentNotificationUseCase,
      idGenerator,
    ),
    getByIdUseCase,
    listUseCase,
    createDraftUseCase,
    updateUseCase,
    submitUseCase,
    resubmitUseCase,
    idGenerator,
    paymentNotification,
  };
}

describe('PaymentNotificationsController', () => {
  it('declares only the approved authenticated client routes and status codes', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, PaymentNotificationsController),
    ).toBe('payment-notifications');
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PaymentNotificationsController),
    ).toContain(JwtAuthGuard);

    const routes = [
      ['list', '/', RequestMethod.GET, HttpStatus.OK],
      ['getById', ':id', RequestMethod.GET, HttpStatus.OK],
      ['create', '/', RequestMethod.POST, HttpStatus.CREATED],
      ['update', ':id', RequestMethod.PATCH, HttpStatus.OK],
      ['submit', ':id/submit', RequestMethod.POST, HttpStatus.OK],
      ['resubmit', ':id/resubmit', RequestMethod.POST, HttpStatus.OK],
    ] as const;

    for (const [method, path, requestMethod, status] of routes) {
      const handler = PaymentNotificationsController.prototype[method];
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(requestMethod);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(status);
    }
  });

  it('gets one client notification with actor and normalized id', async () => {
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
    expect(response.id).toBe('generated-id');
  });

  it('lists notifications using only the actor', async () => {
    const { controller, listUseCase } = createController();

    const response = await controller.list(actor);

    expect(listUseCase.execute).toHaveBeenCalledTimes(1);
    expect(listUseCase.execute).toHaveBeenCalledWith({ actor });
    expect(response).toHaveLength(1);
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('creates a draft with one generated id, the actor, and a Date', async () => {
    const { controller, createDraftUseCase, idGenerator } = createController();

    const response = await controller.create(actor, dto);

    expect(idGenerator).toHaveBeenCalledTimes(1);
    expect(createDraftUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createDraftUseCase.execute).toHaveBeenCalledWith({
      actor,
      id: 'generated-id',
      paymentDate: new Date(dto.paymentDate),
      amount: dto.amount,
      currency: dto.currency,
      bankReference: dto.bankReference,
      receiptFileId: dto.receiptFileId,
      invoiceIds: dto.invoiceIds,
    });
    expect(createDraftUseCase.execute.mock.calls[0][0]).not.toHaveProperty(
      'customerId',
    );
    expect(response).not.toHaveProperty('pipelineResult');
    expect(response).not.toHaveProperty('actor');
  });

  it('updates exactly once with the normalized id, actor, and Date', async () => {
    const { controller, updateUseCase } = createController();

    await controller.update(
      '  payment-notification-1  ',
      actor,
      dto as UpdatePaymentNotificationDto,
    );

    expect(updateUseCase.execute).toHaveBeenCalledTimes(1);
    expect(updateUseCase.execute).toHaveBeenCalledWith({
      actor,
      id: 'payment-notification-1',
      paymentDate: new Date(dto.paymentDate),
      amount: dto.amount,
      currency: dto.currency,
      bankReference: dto.bankReference,
      receiptFileId: dto.receiptFileId,
      invoiceIds: dto.invoiceIds,
    });
  });

  it.each([
    ['submit', 'submitUseCase'],
    ['resubmit', 'resubmitUseCase'],
  ] as const)('executes %s once and hides pipelineResult', async (method, key) => {
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
    expect(response).not.toBe(context.paymentNotification);
  });

  it.each(['', '   '])('rejects an invalid id %j', async (id) => {
    const { controller, submitUseCase } = createController();

    await expect(controller.submit(id, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(submitUseCase.execute).not.toHaveBeenCalled();
  });

  it('propagates use-case errors unchanged', async () => {
    const { controller, updateUseCase } = createController();
    const applicationError = new Error('Application failed');
    updateUseCase.execute.mockRejectedValue(applicationError);

    await expect(
      controller.update('payment-notification-1', actor, dto),
    ).rejects.toBe(applicationError);
  });

  it('contains no repository, Dataverse, role, permission, or bypass logic', () => {
    const source = readFileSync(__filename.replace('.spec.ts', '.ts'), 'utf8');

    expect(source).not.toMatch(
      /repository|Dataverse|actor\.roles|approvalGroupIds|Nexus\.Admin|effect\s*:\s*['"]allow['"]/,
    );
    expect(source).not.toMatch(/@Query|@Headers/);
  });
});
