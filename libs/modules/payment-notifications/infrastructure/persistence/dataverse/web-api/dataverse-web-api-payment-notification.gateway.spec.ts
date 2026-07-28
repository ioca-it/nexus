import { PaymentNotificationStatus } from '../../../../domain/payment-notification.types';
import type { PaymentNotificationPersistence } from '../../mappers';
import type { DataverseClient, DataverseOperation } from './dataverse-client';
import type { DataversePaymentNotificationSchema } from './dataverse-payment-notification.schema';
import { DataverseWebApiPaymentNotificationGateway } from './dataverse-web-api-payment-notification.gateway';

const schema: DataversePaymentNotificationSchema = Object.freeze({
  notificationEntitySet: 'configured_notifications',
  invoiceEntitySet: 'configured_notification_invoices',
  notificationFields: Object.freeze({
    id: 'configured_notification_id',
    customerId: 'configured_customer_id',
    status: 'configured_status',
    paymentDate: 'configured_payment_date',
    amount: 'configured_amount',
    currency: 'configured_currency',
    bankReference: 'configured_bank_reference',
    receiptFileId: 'configured_receipt_file_id',
    createdAt: 'configured_created_at',
    updatedAt: 'configured_updated_at',
  }),
  invoiceFields: Object.freeze({
    id: 'configured_relation_id',
    paymentNotificationId: 'configured_parent_id',
    invoiceId: 'configured_invoice_id',
    createdAt: 'configured_relation_created_at',
  }),
});

function createPersistence(
  overrides: {
    readonly invoiceIds?: readonly string[];
    readonly receiptFileId?: string;
  } = {},
): PaymentNotificationPersistence {
  const receiptFileId =
    'receiptFileId' in overrides ? overrides.receiptFileId : 'receipt-file-1';
  const invoiceIds = overrides.invoiceIds ?? ['invoice-1', 'invoice-2'];

  return Object.freeze({
    notification: Object.freeze({
      id: 'payment-notification-1',
      customerId: 'customer-1',
      status: PaymentNotificationStatus.CHANGES_REQUESTED,
      paymentDate: '2026-07-20T00:00:00.000Z',
      amount: 125.5,
      currency: 'USD',
      bankReference: 'BANK-REFERENCE-1',
      receiptFileId,
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-23T00:00:00.000Z',
    }),
    invoices: Object.freeze(
      invoiceIds.map((invoiceId, index) =>
        Object.freeze({
          id: `relation-${index + 1}`,
          paymentNotificationId: 'payment-notification-1',
          invoiceId,
          createdAt: '2026-07-21T00:00:00.000Z',
        }),
      ),
    ),
  });
}

function createPhysicalNotification(
  id = 'payment-notification-1',
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    [schema.notificationFields.id]: id,
    [schema.notificationFields.customerId]: 'customer-1',
    [schema.notificationFields.status]:
      PaymentNotificationStatus.CHANGES_REQUESTED,
    [schema.notificationFields.paymentDate]: '2026-07-20T00:00:00.000Z',
    [schema.notificationFields.amount]: 125.5,
    [schema.notificationFields.currency]: 'USD',
    [schema.notificationFields.bankReference]: 'BANK-REFERENCE-1',
    [schema.notificationFields.receiptFileId]: 'receipt-file-1',
    [schema.notificationFields.createdAt]: '2026-07-21T00:00:00.000Z',
    [schema.notificationFields.updatedAt]: '2026-07-23T00:00:00.000Z',
  });
}

function createPhysicalInvoice(
  id: string,
  paymentNotificationId: string,
  invoiceId: string,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    [schema.invoiceFields.id]: id,
    [schema.invoiceFields.paymentNotificationId]: paymentNotificationId,
    [schema.invoiceFields.invoiceId]: invoiceId,
    [schema.invoiceFields.createdAt]: '2026-07-21T00:00:00.000Z',
  });
}

function createClient(): jest.Mocked<DataverseClient> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    deleteWhere: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockResolvedValue(null),
    query: jest.fn().mockResolvedValue([]),
    executeAtomic: jest.fn().mockResolvedValue(undefined),
  };
}

function createGateway(
  client: DataverseClient,
): DataverseWebApiPaymentNotificationGateway {
  return new DataverseWebApiPaymentNotificationGateway({ client, schema });
}

function expectNoIndividualWrites(client: jest.Mocked<DataverseClient>): void {
  expect(client.create).not.toHaveBeenCalled();
  expect(client.update).not.toHaveBeenCalled();
  expect(client.deleteWhere).not.toHaveBeenCalled();
}

describe('DataverseWebApiPaymentNotificationGateway', () => {
  it('creates the notification and all invoice relationships atomically once', async () => {
    const persistence = createPersistence();
    const client = createClient();
    const gateway = createGateway(client);

    await gateway.create(persistence);

    expect(client.executeAtomic).toHaveBeenCalledTimes(1);
    const operations = client.executeAtomic.mock.calls[0][0];
    expect(operations).toHaveLength(3);
    expect(operations[0]).toEqual({
      type: 'create',
      entitySet: schema.notificationEntitySet,
      record: {
        [schema.notificationFields.id]: persistence.notification.id,
        [schema.notificationFields.customerId]:
          persistence.notification.customerId,
        [schema.notificationFields.status]: persistence.notification.status,
        [schema.notificationFields.paymentDate]:
          persistence.notification.paymentDate,
        [schema.notificationFields.amount]: persistence.notification.amount,
        [schema.notificationFields.currency]: persistence.notification.currency,
        [schema.notificationFields.bankReference]:
          persistence.notification.bankReference,
        [schema.notificationFields.receiptFileId]:
          persistence.notification.receiptFileId,
        [schema.notificationFields.createdAt]:
          persistence.notification.createdAt,
        [schema.notificationFields.updatedAt]:
          persistence.notification.updatedAt,
      },
    });
    expect(operations.slice(1)).toEqual([
      {
        type: 'create',
        entitySet: schema.invoiceEntitySet,
        record: {
          [schema.invoiceFields.id]: 'relation-1',
          [schema.invoiceFields.paymentNotificationId]:
            'payment-notification-1',
          [schema.invoiceFields.invoiceId]: 'invoice-1',
          [schema.invoiceFields.createdAt]: '2026-07-21T00:00:00.000Z',
        },
      },
      {
        type: 'create',
        entitySet: schema.invoiceEntitySet,
        record: {
          [schema.invoiceFields.id]: 'relation-2',
          [schema.invoiceFields.paymentNotificationId]:
            'payment-notification-1',
          [schema.invoiceFields.invoiceId]: 'invoice-2',
          [schema.invoiceFields.createdAt]: '2026-07-21T00:00:00.000Z',
        },
      },
    ]);
    expectNoIndividualWrites(client);
  });

  it('creates only the notification when there are no invoices', async () => {
    const client = createClient();
    const gateway = createGateway(client);

    await gateway.create(createPersistence({ invoiceIds: [] }));

    expect(client.executeAtomic).toHaveBeenCalledTimes(1);
    expect(client.executeAtomic.mock.calls[0][0]).toHaveLength(1);
    expectNoIndividualWrites(client);
  });

  it('replaces notification and relationships in one atomic batch', async () => {
    const persistence = createPersistence({ invoiceIds: ['invoice-3'] });
    const client = createClient();
    const gateway = createGateway(client);

    await gateway.replace(persistence);

    expect(client.executeAtomic).toHaveBeenCalledTimes(1);
    const operations = client.executeAtomic.mock.calls[0][0];
    expect(operations).toHaveLength(3);
    expect(operations[0]).toMatchObject({
      type: 'update',
      entitySet: schema.notificationEntitySet,
      id: persistence.notification.id,
    });
    expect(operations[1]).toEqual({
      type: 'deleteWhere',
      entitySet: schema.invoiceEntitySet,
      filter: {
        [schema.invoiceFields.paymentNotificationId]:
          persistence.notification.id,
      },
    });
    expect(operations[2]).toMatchObject({
      type: 'create',
      entitySet: schema.invoiceEntitySet,
      record: {
        [schema.invoiceFields.invoiceId]: 'invoice-3',
        [schema.invoiceFields.paymentNotificationId]:
          persistence.notification.id,
      },
    });
    expectNoIndividualWrites(client);
  });

  it('findById returns null without querying relationships', async () => {
    const client = createClient();
    const gateway = createGateway(client);

    const result = await gateway.findById('missing-notification');

    expect(result).toBeNull();
    expect(client.findOne).toHaveBeenCalledTimes(1);
    expect(client.findOne).toHaveBeenCalledWith(
      schema.notificationEntitySet,
      'missing-notification',
    );
    expect(client.query).not.toHaveBeenCalled();
  });

  it('findById rebuilds notification and invoice records', async () => {
    const client = createClient();
    client.findOne.mockResolvedValue(createPhysicalNotification());
    client.query.mockResolvedValue([
      createPhysicalInvoice(
        'relation-1',
        'payment-notification-1',
        'invoice-1',
      ),
    ]);
    const gateway = createGateway(client);

    const result = await gateway.findById('payment-notification-1');

    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith(schema.invoiceEntitySet, {
      [schema.invoiceFields.paymentNotificationId]: 'payment-notification-1',
    });
    expect(result).toEqual({
      notification: createPersistence().notification,
      invoices: [createPersistence().invoices[0]],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.invoices)).toBe(true);
  });

  it.each([
    [createPhysicalNotification(), true],
    [null, false],
  ] as const)('exists returns %s presence as %s', async (record, expected) => {
    const client = createClient();
    client.findOne.mockResolvedValue(record);
    const gateway = createGateway(client);

    const result = await gateway.exists('payment-notification-1');

    expect(result).toBe(expected);
    expect(client.findOne).toHaveBeenCalledTimes(1);
    expect(client.findOne).toHaveBeenCalledWith(
      schema.notificationEntitySet,
      'payment-notification-1',
    );
    expect(client.query).not.toHaveBeenCalled();
  });

  it('findByBankReference applies both configured criteria', async () => {
    const client = createClient();
    client.query.mockResolvedValueOnce([]);
    const gateway = createGateway(client);

    const result = await gateway.findByBankReference(
      'customer-1',
      'BANK-REFERENCE-1',
    );

    expect(result).toEqual([]);
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith(schema.notificationEntitySet, {
      [schema.notificationFields.customerId]: 'customer-1',
      [schema.notificationFields.bankReference]: 'BANK-REFERENCE-1',
    });
  });

  it('findByCustomer applies the configured customer criterion', async () => {
    const client = createClient();
    client.query.mockResolvedValueOnce([]);
    const gateway = createGateway(client);

    const result = await gateway.findByCustomer('customer-1');

    expect(result).toEqual([]);
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenCalledWith(schema.notificationEntitySet, {
      [schema.notificationFields.customerId]: 'customer-1',
    });
  });

  it('loads relationships for multiple notifications in one grouped query', async () => {
    const first = createPhysicalNotification('payment-notification-1');
    const second = Object.freeze({
      ...createPhysicalNotification('payment-notification-2'),
      [schema.notificationFields.bankReference]: 'BANK-REFERENCE-2',
    });
    const client = createClient();
    client.query
      .mockResolvedValueOnce([first, second])
      .mockResolvedValueOnce([
        createPhysicalInvoice(
          'relation-1',
          'payment-notification-1',
          'invoice-1',
        ),
        createPhysicalInvoice(
          'relation-2',
          'payment-notification-2',
          'invoice-2',
        ),
      ]);
    const gateway = createGateway(client);

    const result = await gateway.findByCustomer('customer-1');

    expect(client.query).toHaveBeenCalledTimes(2);
    expect(client.query.mock.calls[1]).toEqual([
      schema.invoiceEntitySet,
      {
        [schema.invoiceFields.paymentNotificationId]: [
          'payment-notification-1',
          'payment-notification-2',
        ],
      },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.invoices[0]?.invoiceId).toBe('invoice-1');
    expect(result[1]?.invoices[0]?.invoiceId).toBe('invoice-2');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('preserves an optional receiptFileId when absent', async () => {
    const persistence = createPersistence({ receiptFileId: undefined });
    const physicalWithoutReceipt = Object.freeze({
      ...createPhysicalNotification(),
      [schema.notificationFields.receiptFileId]: undefined,
    });
    const client = createClient();
    const gateway = createGateway(client);

    await gateway.create(persistence);
    client.findOne.mockResolvedValue(physicalWithoutReceipt);
    const result = await gateway.findById('payment-notification-1');

    const createOperation = client.executeAtomic.mock.calls[0][0][0] as Extract<
      DataverseOperation,
      { type: 'create' }
    >;
    expect(
      schema.notificationFields.receiptFileId in createOperation.record,
    ).toBe(false);
    expect(result?.notification.receiptFileId).toBeUndefined();
  });

  it.each([
    [
      'notification',
      {
        ...createPhysicalNotification(),
        [schema.notificationFields.customerId]: undefined,
      },
      'configured_customer_id',
    ],
    [
      'notification',
      {
        ...createPhysicalNotification(),
        [schema.notificationFields.paymentDate]: 'not-a-date',
      },
      'configured_payment_date',
    ],
  ] as const)(
    'rejects an invalid %s record field %s',
    async (_recordType, physicalRecord, expectedField) => {
      const client = createClient();
      client.findOne.mockResolvedValue(physicalRecord);
      const gateway = createGateway(client);

      await expect(gateway.findById('payment-notification-1')).rejects.toThrow(
        `Invalid Dataverse payment notification record: missing or invalid field "${expectedField}"`,
      );
      expect(client.query).not.toHaveBeenCalled();
    },
  );

  it('rejects an incomplete invoice relationship record', async () => {
    const client = createClient();
    client.findOne.mockResolvedValue(createPhysicalNotification());
    client.query.mockResolvedValue([
      {
        ...createPhysicalInvoice(
          'relation-1',
          'payment-notification-1',
          'invoice-1',
        ),
        [schema.invoiceFields.invoiceId]: undefined,
      },
    ]);
    const gateway = createGateway(client);

    await expect(gateway.findById('payment-notification-1')).rejects.toThrow(
      'Invalid Dataverse payment notification invoice record: missing or invalid field "configured_invoice_id"',
    );
  });

  it.each([
    [
      'executeAtomic',
      async (gateway: DataverseWebApiPaymentNotificationGateway) =>
        gateway.create(createPersistence()),
    ],
    [
      'findOne',
      async (gateway: DataverseWebApiPaymentNotificationGateway) =>
        gateway.findById('payment-notification-1'),
    ],
    [
      'query',
      async (gateway: DataverseWebApiPaymentNotificationGateway) =>
        gateway.findByCustomer('customer-1'),
    ],
  ] as const)(
    'propagates %s client errors without transforming them',
    async (method, execute) => {
      const client = createClient();
      const clientError = new Error(`${method} failed`);
      client[method].mockRejectedValue(clientError);
      const gateway = createGateway(client);

      await expect(execute(gateway)).rejects.toBe(clientError);
    },
  );

  it('does not modify persistence or physical record inputs', async () => {
    const persistence = createPersistence();
    const physicalNotification = createPhysicalNotification();
    const physicalInvoices = Object.freeze([
      createPhysicalInvoice(
        'relation-1',
        'payment-notification-1',
        'invoice-1',
      ),
    ]);
    const client = createClient();
    client.findOne.mockResolvedValue(physicalNotification);
    client.query.mockResolvedValue(physicalInvoices);
    const gateway = createGateway(client);

    await gateway.create(persistence);
    await gateway.findById('payment-notification-1');

    expect(persistence).toEqual(createPersistence());
    expect(physicalNotification).toEqual(createPhysicalNotification());
    expect(physicalInvoices).toEqual([
      createPhysicalInvoice(
        'relation-1',
        'payment-notification-1',
        'invoice-1',
      ),
    ]);
  });
});
