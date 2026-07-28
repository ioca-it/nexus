import { PaymentNotification } from '../../../../domain/payment-notification.entity';
import { PaymentNotificationStatus } from '../../../../domain/payment-notification.types';
import type { PaymentNotificationRepository } from '../../../../domain/repositories';
import { DataversePaymentNotificationRepository } from '../dataverse-payment-notification.repository';
import type { DataversePaymentNotificationSchema } from '../web-api';
import {
  createDataversePaymentNotificationRepository,
  type CreateDataversePaymentNotificationRepositoryDependencies,
} from './create-dataverse-payment-notification-repository';

const BASE_URL = 'https://example.crm.dynamics.com/api/data/v9.2';
const ACCESS_TOKEN = 'access-token-value';

const schema: DataversePaymentNotificationSchema = Object.freeze({
  notificationEntitySet: 'factory_notifications',
  invoiceEntitySet: 'factory_notification_invoices',
  notificationFields: Object.freeze({
    id: 'factory_notification_id',
    customerId: 'factory_customer_id',
    status: 'factory_status',
    paymentDate: 'factory_payment_date',
    amount: 'factory_amount',
    currency: 'factory_currency',
    bankReference: 'factory_bank_reference',
    receiptFileId: 'factory_receipt_file_id',
    createdAt: 'factory_created_at',
    updatedAt: 'factory_updated_at',
  }),
  invoiceFields: Object.freeze({
    id: 'factory_relation_id',
    paymentNotificationId: 'factory_parent_id',
    invoiceId: 'factory_invoice_id',
    createdAt: 'factory_relation_created_at',
  }),
});

function createDomain(
  invoiceIds: readonly string[] = ['invoice-1'],
): PaymentNotification {
  return PaymentNotification.create({
    id: 'payment-notification-1',
    customerId: 'customer-1',
    paymentDate: new Date('2026-07-20T00:00:00.000Z'),
    amount: 125.5,
    currency: 'USD',
    bankReference: 'BANK-REFERENCE-1',
    receiptFileId: 'receipt-file-1',
    invoiceIds,
    createdAt: new Date('2026-07-21T00:00:00.000Z'),
    updatedAt: new Date('2026-07-21T00:00:00.000Z'),
  });
}

function createPhysicalNotification(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    [schema.notificationFields.id]: 'payment-notification-1',
    [schema.notificationFields.customerId]: 'customer-1',
    [schema.notificationFields.status]: PaymentNotificationStatus.DRAFT,
    [schema.notificationFields.paymentDate]: '2026-07-20T00:00:00.000Z',
    [schema.notificationFields.amount]: 125.5,
    [schema.notificationFields.currency]: 'USD',
    [schema.notificationFields.bankReference]: 'BANK-REFERENCE-1',
    [schema.notificationFields.receiptFileId]: 'receipt-file-1',
    [schema.notificationFields.createdAt]: '2026-07-21T00:00:00.000Z',
    [schema.notificationFields.updatedAt]: '2026-07-21T00:00:00.000Z',
  });
}

function createPhysicalInvoice(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    [schema.invoiceFields.id]: 'relation-1',
    [schema.invoiceFields.paymentNotificationId]: 'payment-notification-1',
    [schema.invoiceFields.invoiceId]: 'invoice-1',
    [schema.invoiceFields.createdAt]: '2026-07-21T00:00:00.000Z',
  });
}

function createResponse(status: number, body?: string): Response {
  return new Response(body, { status });
}

function createJsonResponse(status: number, body: unknown): Response {
  return createResponse(status, JSON.stringify(body));
}

function successfulBatchResponse(): Response {
  return createResponse(
    200,
    ['--batchresponse', 'HTTP/1.1 204 No Content', '--batchresponse--'].join(
      '\r\n',
    ),
  );
}

function createDependencies(): {
  readonly dependencies: CreateDataversePaymentNotificationRepositoryDependencies;
  readonly fetchFn: jest.MockedFunction<typeof fetch>;
  readonly getAccessToken: jest.MockedFunction<() => Promise<string>>;
} {
  const fetchFn = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  const getAccessToken = jest.fn<Promise<string>, []>();
  getAccessToken.mockResolvedValue(ACCESS_TOKEN);

  return {
    dependencies: Object.freeze({
      baseUrl: BASE_URL,
      getAccessToken,
      schema,
      fetchFn,
      idGenerator: jest.fn(() => 'injected-relation-id'),
    }),
    fetchFn,
    getAccessToken,
  };
}

describe('createDataversePaymentNotificationRepository', () => {
  it('returns a functional PaymentNotificationRepository implementation', () => {
    const { dependencies } = createDependencies();

    const repository =
      createDataversePaymentNotificationRepository(dependencies);

    expect(repository).toBeInstanceOf(DataversePaymentNotificationRepository);
    expect(repository).toEqual(
      expect.objectContaining<Partial<PaymentNotificationRepository>>({
        create: expect.any(Function),
        update: expect.any(Function),
        findById: expect.any(Function),
        exists: expect.any(Function),
        findByBankReference: expect.any(Function),
        findByCustomer: expect.any(Function),
      }),
    );
  });

  it('composes create through mapper, gateway, client, and one batch request', async () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    fetchFn.mockResolvedValue(successfulBatchResponse());
    const repository =
      createDataversePaymentNotificationRepository(dependencies);

    await repository.create(createDomain());

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE_URL}/$batch`);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('POST');
    const body = fetchFn.mock.calls[0][1]?.body as string;
    expect(body).toContain(schema.notificationEntitySet);
    expect(body).toContain(schema.invoiceEntitySet);
    expect(body).toContain(schema.notificationFields.bankReference);
    expect(body).toContain(schema.invoiceFields.invoiceId);
    expect(body).toContain('injected-relation-id');
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('composes update through one final batch request', async () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    fetchFn
      .mockResolvedValueOnce(createJsonResponse(200, { value: [] }))
      .mockResolvedValueOnce(successfulBatchResponse());
    const repository =
      createDataversePaymentNotificationRepository(dependencies);

    await repository.update(createDomain());

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('GET');
    expect(fetchFn.mock.calls[1][0]).toBe(`${BASE_URL}/$batch`);
    const body = fetchFn.mock.calls[1][1]?.body as string;
    expect(body).toContain('PATCH');
    expect(body).toContain(schema.notificationEntitySet);
    expect(body).toContain(schema.invoiceEntitySet);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('findById reconstructs the domain using the default mapper', async () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    const dependenciesWithoutIdGenerator = Object.freeze({
      baseUrl: dependencies.baseUrl,
      getAccessToken: dependencies.getAccessToken,
      schema: dependencies.schema,
      fetchFn: dependencies.fetchFn,
    });
    fetchFn
      .mockResolvedValueOnce(
        createJsonResponse(200, createPhysicalNotification()),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          value: [createPhysicalInvoice()],
        }),
      );
    const repository = createDataversePaymentNotificationRepository(
      dependenciesWithoutIdGenerator,
    );

    const result = await repository.findById('payment-notification-1');

    expect(result).toBeInstanceOf(PaymentNotification);
    expect(result).toMatchObject({
      id: 'payment-notification-1',
      customerId: 'customer-1',
      status: PaymentNotificationStatus.DRAFT,
      invoiceIds: ['invoice-1'],
    });
    expect(fetchFn.mock.calls[0][0]).toBe(
      `${BASE_URL}/${schema.notificationEntitySet}(payment-notification-1)`,
    );
    expect(new URL(fetchFn.mock.calls[1][0].toString()).pathname).toContain(
      schema.invoiceEntitySet,
    );
    expect(getAccessToken).toHaveBeenCalledTimes(2);
  });

  it('uses the injected idGenerator once per invoice relationship', async () => {
    const { dependencies, fetchFn } = createDependencies();
    const idGenerator = jest
      .fn()
      .mockReturnValueOnce('custom-relation-1')
      .mockReturnValueOnce('custom-relation-2');
    fetchFn.mockResolvedValue(successfulBatchResponse());
    const repository = createDataversePaymentNotificationRepository({
      ...dependencies,
      idGenerator,
    });

    await repository.create(createDomain(['invoice-1', 'invoice-2']));

    expect(idGenerator).toHaveBeenCalledTimes(2);
    const body = fetchFn.mock.calls[0][1]?.body as string;
    expect(body).toContain('custom-relation-1');
    expect(body).toContain('custom-relation-2');
  });

  it('uses the injected fetchFn and access-token provider', async () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    fetchFn.mockResolvedValue(successfulBatchResponse());
    const repository =
      createDataversePaymentNotificationRepository(dependencies);

    await repository.create(createDomain());

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][1]?.headers).toEqual(
      expect.objectContaining({
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      }),
    );
  });

  it.each([
    [
      'baseUrl',
      {
        ...createDependencies().dependencies,
        baseUrl: '   ',
      },
      'Dataverse baseUrl is required',
    ],
    [
      'getAccessToken',
      {
        ...createDependencies().dependencies,
        getAccessToken: undefined,
      },
      'Dataverse getAccessToken is required',
    ],
    [
      'schema',
      {
        ...createDependencies().dependencies,
        schema: undefined,
      },
      'Dataverse payment notification schema is required',
    ],
  ] as const)(
    'rejects an invalid %s dependency',
    (_field, invalidDependencies, expectedError) => {
      expect(() =>
        createDataversePaymentNotificationRepository(
          invalidDependencies as unknown as CreateDataversePaymentNotificationRepositoryDependencies,
        ),
      ).toThrow(expectedError);
    },
  );

  it('propagates dependency errors without transforming them', async () => {
    const { dependencies } = createDependencies();
    const tokenError = new Error('Token provider failed');
    const repository = createDataversePaymentNotificationRepository({
      ...dependencies,
      getAccessToken: jest.fn().mockRejectedValue(tokenError),
    });

    await expect(repository.create(createDomain())).rejects.toBe(tokenError);
  });

  it('does not modify the dependencies received', () => {
    const { dependencies } = createDependencies();
    const original = {
      baseUrl: dependencies.baseUrl,
      getAccessToken: dependencies.getAccessToken,
      schema: dependencies.schema,
      fetchFn: dependencies.fetchFn,
      idGenerator: dependencies.idGenerator,
    };

    createDataversePaymentNotificationRepository(dependencies);

    expect(dependencies).toEqual(original);
    expect(Object.isFrozen(dependencies)).toBe(true);
    expect(Object.isFrozen(dependencies.schema)).toBe(true);
  });
});
