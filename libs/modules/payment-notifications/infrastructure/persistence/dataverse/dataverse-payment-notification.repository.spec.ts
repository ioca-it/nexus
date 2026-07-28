import { PaymentNotification } from '../../../domain/payment-notification.entity';
import { PaymentNotificationStatus } from '../../../domain/payment-notification.types';
import type {
  PaymentNotificationMapper,
  PaymentNotificationPersistence,
} from '../mappers';
import type { DataversePaymentNotificationGateway } from './dataverse-payment-notification.gateway';
import { DataversePaymentNotificationRepository } from './dataverse-payment-notification.repository';

function createDomain(id = 'payment-notification-1'): PaymentNotification {
  return PaymentNotification.create({
    id,
    customerId: 'customer-1',
    paymentDate: new Date('2026-07-20T00:00:00.000Z'),
    amount: 125.5,
    currency: 'USD',
    bankReference: 'BANK-REFERENCE-1',
    receiptFileId: 'receipt-file-1',
    invoiceIds: [],
    createdAt: new Date('2026-07-21T00:00:00.000Z'),
    updatedAt: new Date('2026-07-21T00:00:00.000Z'),
  });
}

function createPersistence(
  id = 'payment-notification-1',
): PaymentNotificationPersistence {
  return Object.freeze({
    notification: Object.freeze({
      id,
      customerId: 'customer-1',
      status: PaymentNotificationStatus.DRAFT,
      paymentDate: '2026-07-20T00:00:00.000Z',
      amount: 125.5,
      currency: 'USD',
      bankReference: 'BANK-REFERENCE-1',
      receiptFileId: 'receipt-file-1',
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:00:00.000Z',
    }),
    invoices: Object.freeze([]),
  });
}

function createGateway(): jest.Mocked<DataversePaymentNotificationGateway> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    replace: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(null),
    exists: jest.fn().mockResolvedValue(false),
    findByBankReference: jest.fn().mockResolvedValue([]),
    findByCustomer: jest.fn().mockResolvedValue([]),
  };
}

function createMapper(): jest.Mocked<PaymentNotificationMapper> {
  return {
    toPersistence: jest.fn(),
    toDomain: jest.fn(),
  };
}

function expectOnlyGatewayMethodCalled(
  gateway: jest.Mocked<DataversePaymentNotificationGateway>,
  method: keyof DataversePaymentNotificationGateway,
): void {
  const methods: readonly (keyof DataversePaymentNotificationGateway)[] = [
    'create',
    'replace',
    'findById',
    'exists',
    'findByBankReference',
    'findByCustomer',
  ];

  for (const candidate of methods) {
    if (candidate !== method) {
      expect(gateway[candidate]).not.toHaveBeenCalled();
    }
  }
}

describe('DataversePaymentNotificationRepository', () => {
  it('maps and delegates create exactly once', async () => {
    const domain = createDomain();
    const persistence = createPersistence();
    const gateway = createGateway();
    const mapper = createMapper();
    mapper.toPersistence.mockReturnValue(persistence);
    const repository = new DataversePaymentNotificationRepository({
      gateway,
      mapper,
    });

    await repository.create(domain);

    expect(mapper.toPersistence).toHaveBeenCalledTimes(1);
    expect(mapper.toPersistence).toHaveBeenCalledWith(domain);
    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(gateway.create).toHaveBeenCalledWith(persistence);
    expect(mapper.toDomain).not.toHaveBeenCalled();
    expectOnlyGatewayMethodCalled(gateway, 'create');
  });

  it('maps update and delegates to replace exactly once', async () => {
    const domain = createDomain();
    const persistence = createPersistence();
    const gateway = createGateway();
    const mapper = createMapper();
    mapper.toPersistence.mockReturnValue(persistence);
    const repository = new DataversePaymentNotificationRepository({
      gateway,
      mapper,
    });

    await repository.update(domain);

    expect(mapper.toPersistence).toHaveBeenCalledTimes(1);
    expect(mapper.toPersistence).toHaveBeenCalledWith(domain);
    expect(gateway.replace).toHaveBeenCalledTimes(1);
    expect(gateway.replace).toHaveBeenCalledWith(persistence);
    expect(gateway.create).not.toHaveBeenCalled();
    expect(mapper.toDomain).not.toHaveBeenCalled();
    expectOnlyGatewayMethodCalled(gateway, 'replace');
  });

  it('findById reconstructs the domain with the injected mapper', async () => {
    const persistence = createPersistence();
    const domain = createDomain();
    const gateway = createGateway();
    gateway.findById.mockResolvedValue(persistence);
    const mapper = createMapper();
    mapper.toDomain.mockReturnValue(domain);
    const repository = new DataversePaymentNotificationRepository({
      gateway,
      mapper,
    });

    const result = await repository.findById('payment-notification-1');

    expect(gateway.findById).toHaveBeenCalledTimes(1);
    expect(gateway.findById).toHaveBeenCalledWith('payment-notification-1');
    expect(mapper.toDomain).toHaveBeenCalledTimes(1);
    expect(mapper.toDomain).toHaveBeenCalledWith(
      persistence.notification,
      persistence.invoices,
    );
    expect(result).toBe(domain);
    expectOnlyGatewayMethodCalled(gateway, 'findById');
  });

  it('findById returns null without invoking the mapper', async () => {
    const gateway = createGateway();
    const mapper = createMapper();
    const repository = new DataversePaymentNotificationRepository({
      gateway,
      mapper,
    });

    const result = await repository.findById('missing-notification');

    expect(result).toBeNull();
    expect(gateway.findById).toHaveBeenCalledTimes(1);
    expect(mapper.toDomain).not.toHaveBeenCalled();
    expect(mapper.toPersistence).not.toHaveBeenCalled();
    expectOnlyGatewayMethodCalled(gateway, 'findById');
  });

  it('exists delegates directly to the gateway', async () => {
    const gateway = createGateway();
    gateway.exists.mockResolvedValue(true);
    const mapper = createMapper();
    const repository = new DataversePaymentNotificationRepository({
      gateway,
      mapper,
    });

    const result = await repository.exists('payment-notification-1');

    expect(result).toBe(true);
    expect(gateway.exists).toHaveBeenCalledTimes(1);
    expect(gateway.exists).toHaveBeenCalledWith('payment-notification-1');
    expect(mapper.toDomain).not.toHaveBeenCalled();
    expect(mapper.toPersistence).not.toHaveBeenCalled();
    expectOnlyGatewayMethodCalled(gateway, 'exists');
  });

  it('findByBankReference maps every gateway result once', async () => {
    const persistence = [
      createPersistence('payment-notification-1'),
      createPersistence('payment-notification-2'),
    ];
    const domains = [
      createDomain('payment-notification-1'),
      createDomain('payment-notification-2'),
    ];
    const gateway = createGateway();
    gateway.findByBankReference.mockResolvedValue(persistence);
    const mapper = createMapper();
    mapper.toDomain
      .mockReturnValueOnce(domains[0])
      .mockReturnValueOnce(domains[1]);
    const repository = new DataversePaymentNotificationRepository({
      gateway,
      mapper,
    });

    const result = await repository.findByBankReference(
      'customer-1',
      'BANK-REFERENCE-1',
    );

    expect(gateway.findByBankReference).toHaveBeenCalledTimes(1);
    expect(gateway.findByBankReference).toHaveBeenCalledWith(
      'customer-1',
      'BANK-REFERENCE-1',
    );
    expect(mapper.toDomain).toHaveBeenCalledTimes(2);
    expect(result).toEqual(domains);
    expect(Object.isFrozen(result)).toBe(true);
    expectOnlyGatewayMethodCalled(gateway, 'findByBankReference');
  });

  it('findByCustomer maps every gateway result once', async () => {
    const persistence = [
      createPersistence('payment-notification-1'),
      createPersistence('payment-notification-2'),
    ];
    const domains = [
      createDomain('payment-notification-1'),
      createDomain('payment-notification-2'),
    ];
    const gateway = createGateway();
    gateway.findByCustomer.mockResolvedValue(persistence);
    const mapper = createMapper();
    mapper.toDomain
      .mockReturnValueOnce(domains[0])
      .mockReturnValueOnce(domains[1]);
    const repository = new DataversePaymentNotificationRepository({
      gateway,
      mapper,
    });

    const result = await repository.findByCustomer('customer-1');

    expect(gateway.findByCustomer).toHaveBeenCalledTimes(1);
    expect(gateway.findByCustomer).toHaveBeenCalledWith('customer-1');
    expect(mapper.toDomain).toHaveBeenCalledTimes(2);
    expect(result).toEqual(domains);
    expect(Object.isFrozen(result)).toBe(true);
    expectOnlyGatewayMethodCalled(gateway, 'findByCustomer');
  });

  it('uses the default mapper when none is injected', async () => {
    const persistence = createPersistence();
    const gateway = createGateway();
    gateway.findById.mockResolvedValue(persistence);
    const repository = new DataversePaymentNotificationRepository({
      gateway,
    });

    const result = await repository.findById('payment-notification-1');

    expect(result).toBeInstanceOf(PaymentNotification);
    expect(result).toMatchObject({
      id: persistence.notification.id,
      customerId: persistence.notification.customerId,
      status: PaymentNotificationStatus.DRAFT,
      invoiceIds: [],
    });
  });

  it.each([
    [
      'create',
      async (repository: DataversePaymentNotificationRepository) =>
        repository.create(createDomain()),
    ],
    [
      'replace',
      async (repository: DataversePaymentNotificationRepository) =>
        repository.update(createDomain()),
    ],
    [
      'findById',
      async (repository: DataversePaymentNotificationRepository) =>
        repository.findById('payment-notification-1'),
    ],
    [
      'exists',
      async (repository: DataversePaymentNotificationRepository) =>
        repository.exists('payment-notification-1'),
    ],
    [
      'findByBankReference',
      async (repository: DataversePaymentNotificationRepository) =>
        repository.findByBankReference('customer-1', 'BANK-REFERENCE-1'),
    ],
    [
      'findByCustomer',
      async (repository: DataversePaymentNotificationRepository) =>
        repository.findByCustomer('customer-1'),
    ],
  ] as const)(
    'propagates %s gateway errors without transforming them',
    async (method, execute) => {
      const gateway = createGateway();
      const mapper = createMapper();
      mapper.toPersistence.mockReturnValue(createPersistence());
      const gatewayError = new Error(`${method} failed`);
      gateway[method].mockRejectedValue(gatewayError);
      const repository = new DataversePaymentNotificationRepository({
        gateway,
        mapper,
      });

      await expect(execute(repository)).rejects.toBe(gatewayError);
    },
  );

  it('does not modify domain or persistence inputs', async () => {
    const domain = createDomain();
    const persistence = createPersistence();
    const gateway = createGateway();
    gateway.findById.mockResolvedValue(persistence);
    const mapper = createMapper();
    mapper.toPersistence.mockReturnValue(persistence);
    mapper.toDomain.mockReturnValue(domain);
    const repository = new DataversePaymentNotificationRepository({
      gateway,
      mapper,
    });

    await repository.create(domain);
    await repository.findById(domain.id);

    expect(Object.isFrozen(domain)).toBe(true);
    expect(persistence).toEqual(createPersistence());
  });
});
