import {
  createAuthenticatedActor,
  type AuthenticatedActor,
} from '@nexus/platform';
import { PaymentNotification } from '../../../domain/payment-notification.entity';
import type { PaymentNotificationRepository } from '../../../domain/repositories';
import {
  PAYMENT_NOTIFICATION_PERMISSION_ACTIONS,
  PAYMENT_NOTIFICATIONS_PERMISSION_MODULE,
} from '../../payment-notification-workflow';
import { GetPaymentNotificationByIdUseCase } from './get-payment-notification-by-id.use-case';
import { ListCustomerPaymentNotificationsUseCase } from './list-customer-payment-notifications.use-case';
import { ListPaymentNotificationsByCustomerUseCase } from './list-payment-notifications-by-customer.use-case';

function createPaymentNotification(
  customerId = 'customer-1',
): PaymentNotification {
  return PaymentNotification.create({
    id: 'payment-notification-1',
    customerId,
    paymentDate: new Date('2026-07-20T00:00:00.000Z'),
    amount: 125.5,
    currency: 'USD',
    bankReference: 'BANK-REFERENCE-1',
    invoiceIds: [],
    createdAt: new Date('2026-07-21T00:00:00.000Z'),
    updatedAt: new Date('2026-07-21T00:00:00.000Z'),
  });
}

function createActor(
  customerId: string | null,
  hasReadPermission = true,
): AuthenticatedActor {
  return createAuthenticatedActor({
    userId: 'actor-1',
    customerId,
    roles: ['Nexus.Admin'],
    permissions: hasReadPermission
      ? [
          {
            module: PAYMENT_NOTIFICATIONS_PERMISSION_MODULE,
            action: PAYMENT_NOTIFICATION_PERMISSION_ACTIONS.READ,
            effect: 'allow',
          },
        ]
      : [],
    approvalGroupIds: [],
  });
}

function createRepository(
  paymentNotification: PaymentNotification | null = createPaymentNotification(),
): jest.Mocked<PaymentNotificationRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn().mockResolvedValue(paymentNotification),
    exists: jest.fn().mockResolvedValue(false),
    findByBankReference: jest.fn().mockResolvedValue([]),
    findByCustomer: jest
      .fn()
      .mockResolvedValue(
        paymentNotification === null ? [] : [paymentNotification],
      ),
  };
}

describe('Payment Notification query use cases', () => {
  it('allows a client to read its own notification', async () => {
    const paymentNotification = createPaymentNotification();
    const repository = createRepository(paymentNotification);
    const useCase = new GetPaymentNotificationByIdUseCase({
      repository,
      scope: 'customer',
    });

    const result = await useCase.execute({
      actor: createActor('customer-1'),
      id: paymentNotification.id,
    });

    expect(result.paymentNotification).toBe(paymentNotification);
    expect(repository.findById).toHaveBeenCalledTimes(1);
  });

  it('denies a client reading another customer notification', async () => {
    const repository = createRepository(createPaymentNotification('customer-2'));
    const useCase = new GetPaymentNotificationByIdUseCase({
      repository,
      scope: 'customer',
    });

    await expect(
      useCase.execute({
        actor: createActor('customer-1'),
        id: 'payment-notification-1',
      }),
    ).rejects.toThrow('Payment notification access denied');
  });

  it('allows administrative reading without customer matching', async () => {
    const paymentNotification = createPaymentNotification('customer-2');
    const repository = createRepository(paymentNotification);
    const useCase = new GetPaymentNotificationByIdUseCase({
      repository,
      scope: 'administrative',
    });

    const result = await useCase.execute({
      actor: createActor('different-customer'),
      id: paymentNotification.id,
    });

    expect(result.paymentNotification).toBe(paymentNotification);
  });

  it('denies administrative reading without an explicit permission', async () => {
    const repository = createRepository();
    const useCase = new GetPaymentNotificationByIdUseCase({
      repository,
      scope: 'administrative',
    });

    await expect(
      useCase.execute({
        actor: createActor(null, false),
        id: 'payment-notification-1',
      }),
    ).rejects.toThrow('Payment notification access denied');
  });

  it('lists only the customer derived from the actor', async () => {
    const paymentNotification = createPaymentNotification();
    const repository = createRepository(paymentNotification);
    const useCase = new ListCustomerPaymentNotificationsUseCase({
      repository,
    });

    const result = await useCase.execute({
      actor: createActor('customer-1'),
    });

    expect(repository.findByCustomer).toHaveBeenCalledTimes(1);
    expect(repository.findByCustomer).toHaveBeenCalledWith('customer-1');
    expect(result.paymentNotifications).toEqual([paymentNotification]);
    expect(Object.isFrozen(result.paymentNotifications)).toBe(true);
  });

  it('denies customer listing without customer context', async () => {
    const repository = createRepository();
    const useCase = new ListCustomerPaymentNotificationsUseCase({
      repository,
    });

    await expect(
      useCase.execute({ actor: createActor(null) }),
    ).rejects.toThrow('Payment notification access denied');
    expect(repository.findByCustomer).not.toHaveBeenCalled();
  });

  it('lists the route customer for an explicitly permitted administrator', async () => {
    const paymentNotification = createPaymentNotification('customer-2');
    const repository = createRepository(paymentNotification);
    const useCase = new ListPaymentNotificationsByCustomerUseCase({
      repository,
    });

    const result = await useCase.execute({
      actor: createActor(null),
      customerId: 'customer-2',
    });

    expect(repository.findByCustomer).toHaveBeenCalledTimes(1);
    expect(repository.findByCustomer).toHaveBeenCalledWith('customer-2');
    expect(result.paymentNotifications).toEqual([paymentNotification]);
  });

  it('does not infer read access from Nexus.Admin', async () => {
    const repository = createRepository();
    const useCase = new ListPaymentNotificationsByCustomerUseCase({
      repository,
    });

    await expect(
      useCase.execute({
        actor: createActor(null, false),
        customerId: 'customer-1',
      }),
    ).rejects.toThrow('Payment notification access denied');
    expect(repository.findByCustomer).not.toHaveBeenCalled();
  });

  it('propagates not-found and repository errors', async () => {
    const missingRepository = createRepository(null);
    const useCase = new GetPaymentNotificationByIdUseCase({
      repository: missingRepository,
      scope: 'customer',
    });

    await expect(
      useCase.execute({
        actor: createActor('customer-1'),
        id: 'missing',
      }),
    ).rejects.toThrow('Payment notification not found');

    const repositoryError = new Error('Read failed');
    missingRepository.findById.mockRejectedValue(repositoryError);
    await expect(
      useCase.execute({
        actor: createActor('customer-1'),
        id: 'payment-notification-1',
      }),
    ).rejects.toBe(repositoryError);
  });
});
