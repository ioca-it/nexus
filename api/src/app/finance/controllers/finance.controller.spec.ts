import { readFileSync } from 'node:fs';

import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
  RequestMethod,
} from '@nestjs/common';
import {
  GUARDS_METADATA,
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import {
  createBusinessCentralCustomerId,
  createCreditMemo,
  createFinanceCreditMemoId,
  createFinanceInvoiceId,
  createInvoice,
  type GetCreditMemoByIdUseCase,
  type GetInvoiceByIdUseCase,
  type ListCustomerCreditMemosUseCase,
  type ListCustomerInvoicesUseCase,
} from '@nexus/modules/finance';
import { createAuthenticatedActor } from '@nexus/platform';

import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { FinanceController } from './finance.controller';

const actor = createAuthenticatedActor({
  userId: 'actor-1',
  customerId: 'nexus-customer-1',
  roles: [],
  permissions: [],
  approvalGroupIds: [],
});

function createFinanceDocuments() {
  return {
    invoice: createInvoice({
      id: createFinanceInvoiceId('invoice-1'),
      number: 'INV-001',
      businessCentralCustomerId:
        createBusinessCentralCustomerId('bc-customer-1'),
      customerNumber: 'BC-001',
      invoiceDate: new Date('2026-07-01T00:00:00.000Z'),
      dueDate: new Date('2026-07-31T00:00:00.000Z'),
      currencyCode: 'USD',
      totalAmount: 125.5,
      remainingAmount: 25.5,
      status: 'Open',
    }),
    creditMemo: createCreditMemo({
      id: createFinanceCreditMemoId('credit-memo-1'),
      number: 'CM-001',
      businessCentralCustomerId:
        createBusinessCentralCustomerId('bc-customer-1'),
      customerNumber: 'BC-001',
      creditMemoDate: new Date('2026-07-02T00:00:00.000Z'),
      currencyCode: 'USD',
      totalAmount: 40,
      remainingAmount: 10,
      status: 'Open',
    }),
  };
}

function createController() {
  const { invoice, creditMemo } = createFinanceDocuments();
  const getInvoiceByIdUseCase = {
    execute: jest.fn().mockResolvedValue(invoice),
  };
  const listCustomerInvoicesUseCase = {
    execute: jest.fn().mockResolvedValue([invoice]),
  };
  const getCreditMemoByIdUseCase = {
    execute: jest.fn().mockResolvedValue(creditMemo),
  };
  const listCustomerCreditMemosUseCase = {
    execute: jest.fn().mockResolvedValue([creditMemo]),
  };

  return {
    controller: new FinanceController(
      getInvoiceByIdUseCase as unknown as GetInvoiceByIdUseCase,
      listCustomerInvoicesUseCase as unknown as ListCustomerInvoicesUseCase,
      getCreditMemoByIdUseCase as unknown as GetCreditMemoByIdUseCase,
      listCustomerCreditMemosUseCase as unknown as ListCustomerCreditMemosUseCase,
    ),
    getInvoiceByIdUseCase,
    listCustomerInvoicesUseCase,
    getCreditMemoByIdUseCase,
    listCustomerCreditMemosUseCase,
    invoice,
    creditMemo,
  };
}

describe('FinanceController', () => {
  it('declares exactly the four approved authenticated GET endpoints', () => {
    expect(Reflect.getMetadata(PATH_METADATA, FinanceController)).toBe(
      'finance',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, FinanceController)).toContain(
      JwtAuthGuard,
    );

    const routes = [
      ['listInvoices', 'invoices'],
      ['getInvoiceById', 'invoices/:id'],
      ['listCreditMemos', 'credit-memos'],
      ['getCreditMemoById', 'credit-memos/:id'],
    ] as const;

    for (const [method, path] of routes) {
      const handler = FinanceController.prototype[method];
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
        RequestMethod.GET,
      );
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(
        HttpStatus.OK,
      );
    }

    const routeCount = Object.getOwnPropertyNames(
      FinanceController.prototype,
    ).filter((method) =>
      Reflect.hasMetadata(
        METHOD_METADATA,
        FinanceController.prototype[method as keyof FinanceController],
      ),
    ).length;

    expect(routeCount).toBe(4);
  });

  it('lists invoices once using exactly the CurrentActor reference', async () => {
    const { controller, listCustomerInvoicesUseCase, invoice } =
      createController();

    const response = await controller.listInvoices(actor);

    expect(listCustomerInvoicesUseCase.execute).toHaveBeenCalledTimes(1);
    expect(listCustomerInvoicesUseCase.execute).toHaveBeenCalledWith({ actor });
    expect(
      listCustomerInvoicesUseCase.execute.mock.calls[0][0],
    ).not.toHaveProperty('customerId');
    expect(response).toHaveLength(1);
    expect(response[0]).not.toBe(invoice);
    expect(response[0]).not.toHaveProperty('businessCentralCustomerId');
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('gets an invoice once with actor and normalized document id', async () => {
    const { controller, getInvoiceByIdUseCase, invoice } = createController();

    const response = await controller.getInvoiceById(' invoice-1 ', actor);

    expect(getInvoiceByIdUseCase.execute).toHaveBeenCalledTimes(1);
    expect(getInvoiceByIdUseCase.execute).toHaveBeenCalledWith({
      actor,
      id: 'invoice-1',
    });
    expect(response).not.toBe(invoice);
    expect(response.invoiceDate).toBe('2026-07-01T00:00:00.000Z');
  });

  it('converts a missing invoice to a generic 404', async () => {
    const { controller, getInvoiceByIdUseCase } = createController();
    getInvoiceByIdUseCase.execute.mockResolvedValue(null);

    await expect(
      controller.getInvoiceById('invoice-unknown', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(getInvoiceByIdUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('lists credit memos once using exactly the CurrentActor reference', async () => {
    const { controller, listCustomerCreditMemosUseCase, creditMemo } =
      createController();

    const response = await controller.listCreditMemos(actor);

    expect(listCustomerCreditMemosUseCase.execute).toHaveBeenCalledTimes(1);
    expect(listCustomerCreditMemosUseCase.execute).toHaveBeenCalledWith({
      actor,
    });
    expect(
      listCustomerCreditMemosUseCase.execute.mock.calls[0][0],
    ).not.toHaveProperty('customerId');
    expect(response).toHaveLength(1);
    expect(response[0]).not.toBe(creditMemo);
    expect(response[0]).not.toHaveProperty('businessCentralCustomerId');
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('gets a credit memo once with actor and normalized document id', async () => {
    const { controller, getCreditMemoByIdUseCase, creditMemo } =
      createController();

    const response = await controller.getCreditMemoById(
      ' credit-memo-1 ',
      actor,
    );

    expect(getCreditMemoByIdUseCase.execute).toHaveBeenCalledTimes(1);
    expect(getCreditMemoByIdUseCase.execute).toHaveBeenCalledWith({
      actor,
      id: 'credit-memo-1',
    });
    expect(response).not.toBe(creditMemo);
    expect(response.creditMemoDate).toBe('2026-07-02T00:00:00.000Z');
  });

  it('converts a missing credit memo to a generic 404', async () => {
    const { controller, getCreditMemoByIdUseCase } = createController();
    getCreditMemoByIdUseCase.execute.mockResolvedValue(null);

    await expect(
      controller.getCreditMemoById('credit-memo-unknown', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(getCreditMemoByIdUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['getInvoiceById', 'getInvoiceByIdUseCase', ''],
    ['getInvoiceById', 'getInvoiceByIdUseCase', '   '],
    ['getCreditMemoById', 'getCreditMemoByIdUseCase', ''],
    ['getCreditMemoById', 'getCreditMemoByIdUseCase', '   '],
  ] as const)(
    'rejects an invalid id before %s executes',
    async (method, useCase, id) => {
      const context = createController();

      await expect(
        context.controller[method](id, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(context[useCase].execute).not.toHaveBeenCalled();
    },
  );

  it('propagates technical use-case errors unchanged', async () => {
    const { controller, listCustomerInvoicesUseCase } = createController();
    const technicalError = new Error('Technical failure');
    listCustomerInvoicesUseCase.execute.mockRejectedValue(technicalError);

    await expect(controller.listInvoices(actor)).rejects.toBe(technicalError);
  });

  it('uses CurrentActor exclusively and contains no direct authorization or infrastructure access', () => {
    const source = readFileSync(__filename.replace('.spec.ts', '.ts'), 'utf8');

    expect(source.match(/@CurrentActor\(\)/g)).toHaveLength(4);
    expect(source).not.toMatch(/@Body|@Query|@Headers/);
    expect(source).not.toMatch(
      /actor\.roles|Nexus\.Admin|RolesGuard|evaluatePermission|repository|gateway|Dataverse|BusinessCentralHttpClient/,
    );
    expect(source).not.toMatch(/customerId|businessCentralCustomerId/);
  });
});
