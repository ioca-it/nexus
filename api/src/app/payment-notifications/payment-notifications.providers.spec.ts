import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getAppConfig, type NexusConfig } from '@nexus/config';
import {
  CreateDraftPaymentNotificationUseCase,
  RejectPaymentNotificationUseCase,
  RequestChangesPaymentNotificationUseCase,
  ResubmitPaymentNotificationUseCase,
  StartReviewPaymentNotificationUseCase,
  SubmitPaymentNotificationUseCase,
  UpdatePaymentNotificationUseCase,
  ValidatePaymentNotificationUseCase,
  type Clock,
  type PaymentNotification,
  type PaymentNotificationRepository,
} from '@nexus/modules/payment-notifications';
import { createDataversePaymentNotificationRepository } from '@nexus/modules/payment-notifications/infrastructure';
import {
  createAzureAccessTokenProvider,
  createDataverseAccessTokenProvider,
  createStateTransition,
  type AzureAccessTokenProvider,
  type DataverseAccessTokenProvider,
  type StateTransition,
} from '@nexus/platform';

import { AppModule } from '../app.module';
import {
  AZURE_ACCESS_TOKEN_PROVIDER,
  DATAVERSE_ACCESS_TOKEN_PROVIDER,
  DataverseModule,
} from '../dataverse';
import {
  azureAccessTokenProviderDefinition,
  dataverseAccessTokenProviderDefinition,
} from '../dataverse/dataverse.providers';
import { PaymentNotificationsModule } from './payment-notifications.module';
import {
  createDraftPaymentNotificationUseCaseProviderDefinition,
  paymentNotificationRepositoryProviderDefinition,
  paymentNotificationStateTransitionProviderDefinition,
  rejectPaymentNotificationUseCaseProviderDefinition,
  requestChangesPaymentNotificationUseCaseProviderDefinition,
  resubmitPaymentNotificationUseCaseProviderDefinition,
  startReviewPaymentNotificationUseCaseProviderDefinition,
  submitPaymentNotificationUseCaseProviderDefinition,
  updatePaymentNotificationUseCaseProviderDefinition,
  validatePaymentNotificationUseCaseProviderDefinition,
} from './payment-notifications.providers';
import {
  CREATE_DRAFT_PAYMENT_NOTIFICATION_USE_CASE,
  PAYMENT_NOTIFICATION_CLOCK,
  PAYMENT_NOTIFICATION_REPOSITORY,
  PAYMENT_NOTIFICATION_STATE_TRANSITION,
  REJECT_PAYMENT_NOTIFICATION_USE_CASE,
  REQUEST_CHANGES_PAYMENT_NOTIFICATION_USE_CASE,
  RESUBMIT_PAYMENT_NOTIFICATION_USE_CASE,
  START_REVIEW_PAYMENT_NOTIFICATION_USE_CASE,
  SUBMIT_PAYMENT_NOTIFICATION_USE_CASE,
  UPDATE_PAYMENT_NOTIFICATION_USE_CASE,
  VALIDATE_PAYMENT_NOTIFICATION_USE_CASE,
} from './payment-notifications.tokens';

jest.mock('@nexus/config', () => ({
  getAppConfig: jest.fn(),
}));

jest.mock('@nexus/platform', () => ({
  createAzureAccessTokenProvider: jest.fn(),
  createDataverseAccessTokenProvider: jest.fn(),
  createStateTransition: jest.fn(),
}));

jest.mock('@nexus/modules/payment-notifications', () => ({
  CreateDraftPaymentNotificationUseCase: jest.fn(),
  UpdatePaymentNotificationUseCase: jest.fn(),
  SubmitPaymentNotificationUseCase: jest.fn(),
  StartReviewPaymentNotificationUseCase: jest.fn(),
  ValidatePaymentNotificationUseCase: jest.fn(),
  RejectPaymentNotificationUseCase: jest.fn(),
  RequestChangesPaymentNotificationUseCase: jest.fn(),
  ResubmitPaymentNotificationUseCase: jest.fn(),
}));

jest.mock('@nexus/modules/payment-notifications/infrastructure', () => ({
  createDataversePaymentNotificationRepository: jest.fn(),
}));

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn(() => jest.fn()),
}));

const schema = Object.freeze({
  notificationEntitySet: 'test_notifications',
  invoiceEntitySet: 'test_notification_invoices',
  notificationFields: Object.freeze({
    id: 'test_notification_id',
    customerId: 'test_customer_id',
    status: 'test_status',
    paymentDate: 'test_payment_date',
    amount: 'test_amount',
    currency: 'test_currency',
    bankReference: 'test_bank_reference',
    receiptFileId: 'test_receipt_file_id',
    createdAt: 'test_created_at',
    updatedAt: 'test_updated_at',
  }),
  invoiceFields: Object.freeze({
    id: 'test_relation_id',
    paymentNotificationId: 'test_relation_notification_id',
    invoiceId: 'test_relation_invoice_id',
    createdAt: 'test_relation_created_at',
  }),
});

const config: NexusConfig = Object.freeze({
  application: Object.freeze({
    nodeEnv: 'test',
    appEnv: 'development',
    apiUrl: 'https://api.example.test',
    frontendUrl: 'https://portal.example.test',
  }),
  azure: Object.freeze({
    tenantId: 'test-tenant-id',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    keyVaultUrl: 'https://vault.example.test',
    storageAccountName: 'teststorage',
    applicationInsightsConnectionString: '',
  }),
  dataverse: Object.freeze({
    environmentUrl: ' https://example.crm.dynamics.com/// ',
    apiVersion: ' /v9.2/ ',
    paymentNotifications: Object.freeze({ schema }),
  }),
  businessCentral: Object.freeze({
    tenantId: 'test-bc-tenant',
    environment: 'test-bc-environment',
    companyId: 'test-bc-company',
  }),
});

const azureAccessTokenProvider: AzureAccessTokenProvider = Object.freeze({
  getAccessToken: jest.fn(),
});
const dataverseAccessTokenProvider: DataverseAccessTokenProvider =
  Object.freeze({
    getAccessToken: jest.fn().mockResolvedValue('dataverse-access-token'),
  });
const repository = Object.freeze(
  {},
) as unknown as PaymentNotificationRepository;
const stateTransition = Object.freeze({
  execute: jest.fn(),
}) as unknown as StateTransition<PaymentNotification>;

const useCaseTokens = [
  CREATE_DRAFT_PAYMENT_NOTIFICATION_USE_CASE,
  UPDATE_PAYMENT_NOTIFICATION_USE_CASE,
  SUBMIT_PAYMENT_NOTIFICATION_USE_CASE,
  START_REVIEW_PAYMENT_NOTIFICATION_USE_CASE,
  VALIDATE_PAYMENT_NOTIFICATION_USE_CASE,
  REJECT_PAYMENT_NOTIFICATION_USE_CASE,
  REQUEST_CHANGES_PAYMENT_NOTIFICATION_USE_CASE,
  RESUBMIT_PAYMENT_NOTIFICATION_USE_CASE,
] as const;

const useCaseConstructors = [
  CreateDraftPaymentNotificationUseCase,
  UpdatePaymentNotificationUseCase,
  SubmitPaymentNotificationUseCase,
  StartReviewPaymentNotificationUseCase,
  ValidatePaymentNotificationUseCase,
  RejectPaymentNotificationUseCase,
  RequestChangesPaymentNotificationUseCase,
  ResubmitPaymentNotificationUseCase,
] as const;

const transitionUseCaseConstructors = [
  SubmitPaymentNotificationUseCase,
  StartReviewPaymentNotificationUseCase,
  ValidatePaymentNotificationUseCase,
  RejectPaymentNotificationUseCase,
  RequestChangesPaymentNotificationUseCase,
  ResubmitPaymentNotificationUseCase,
] as const;

interface ComposedUseCaseDependencies {
  readonly repository: PaymentNotificationRepository;
  readonly stateTransition?: StateTransition<PaymentNotification>;
  readonly clock: Clock;
}

function getComposedDependencies(
  useCaseConstructor: unknown,
): ComposedUseCaseDependencies {
  const dependencies = (useCaseConstructor as jest.Mock).mock.calls[0]?.[0] as
    | ComposedUseCaseDependencies
    | undefined;

  if (dependencies === undefined) {
    throw new Error('Use-case provider factory was not executed');
  }

  return dependencies;
}

const productionSource = [
  'payment-notifications.tokens.ts',
  'payment-notifications.providers.ts',
  'payment-notifications.module.ts',
]
  .map((fileName) => readFileSync(join(__dirname, fileName), 'utf8'))
  .join('\n');

async function createTestingModule() {
  return Test.createTestingModule({
    imports: [PaymentNotificationsModule],
  }).compile();
}

describe('Payment Notifications providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAppConfig).mockReturnValue(config);
    jest
      .mocked(createAzureAccessTokenProvider)
      .mockReturnValue(azureAccessTokenProvider);
    jest
      .mocked(createDataverseAccessTokenProvider)
      .mockReturnValue(dataverseAccessTokenProvider);
    jest
      .mocked(createDataversePaymentNotificationRepository)
      .mockReturnValue(repository);
    jest.mocked(createStateTransition).mockReturnValue(stateTransition);
    jest
      .mocked(dataverseAccessTokenProvider.getAccessToken)
      .mockResolvedValue('dataverse-access-token');
  });

  it('defines stable Symbol injection tokens', () => {
    const tokens = [
      PAYMENT_NOTIFICATION_REPOSITORY,
      PAYMENT_NOTIFICATION_CLOCK,
      PAYMENT_NOTIFICATION_STATE_TRANSITION,
      ...useCaseTokens,
    ];

    expect(tokens.every((token) => typeof token === 'symbol')).toBe(true);
  });

  it('registers AZURE_ACCESS_TOKEN_PROVIDER', async () => {
    const module = await createTestingModule();

    expect(module.get(AZURE_ACCESS_TOKEN_PROVIDER)).toBe(
      azureAccessTokenProvider,
    );
  });

  it('registers DATAVERSE_ACCESS_TOKEN_PROVIDER', async () => {
    const module = await createTestingModule();

    expect(module.get(DATAVERSE_ACCESS_TOKEN_PROVIDER)).toBe(
      dataverseAccessTokenProvider,
    );
  });

  it('registers PAYMENT_NOTIFICATION_REPOSITORY', async () => {
    const module = await createTestingModule();

    expect(module.get(PAYMENT_NOTIFICATION_REPOSITORY)).toBe(repository);
  });

  it('registers all eight use-case providers', async () => {
    const module = await createTestingModule();

    useCaseTokens.forEach((token, index) => {
      expect(module.get(token)).toBe(
        jest.mocked(useCaseConstructors[index]).mock.instances[0],
      );
    });
  });

  it('exports all eight use-case providers', async () => {
    const USE_CASE_CONSUMER = Symbol('USE_CASE_CONSUMER');

    @Module({
      imports: [PaymentNotificationsModule],
      providers: [
        {
          provide: USE_CASE_CONSUMER,
          inject: [...useCaseTokens],
          useFactory: (...useCases: readonly unknown[]) => useCases,
        },
      ],
    })
    class ConsumerModule {}

    const module = await Test.createTestingModule({
      imports: [ConsumerModule],
    }).compile();

    expect(module.get<readonly unknown[]>(USE_CASE_CONSUMER)).toHaveLength(8);
  });

  it('injects repository and clock into Create Draft', async () => {
    const module = await createTestingModule();
    const clock = module.get<Clock>(PAYMENT_NOTIFICATION_CLOCK);

    expect(CreateDraftPaymentNotificationUseCase).toHaveBeenCalledWith({
      repository,
      clock,
    });
  });

  it('injects repository and clock into Update', async () => {
    const module = await createTestingModule();
    const clock = module.get<Clock>(PAYMENT_NOTIFICATION_CLOCK);

    expect(UpdatePaymentNotificationUseCase).toHaveBeenCalledWith({
      repository,
      clock,
    });
  });

  it.each([
    ['Submit', SubmitPaymentNotificationUseCase],
    ['Start Review', StartReviewPaymentNotificationUseCase],
    ['Validate', ValidatePaymentNotificationUseCase],
    ['Reject', RejectPaymentNotificationUseCase],
    ['Request Changes', RequestChangesPaymentNotificationUseCase],
    ['Resubmit', ResubmitPaymentNotificationUseCase],
  ] as const)(
    'injects repository, StateTransition and clock into %s',
    async (_name, useCaseConstructor) => {
      const module = await createTestingModule();
      const clock = module.get<Clock>(PAYMENT_NOTIFICATION_CLOCK);

      expect(useCaseConstructor).toHaveBeenCalledWith({
        repository,
        stateTransition,
        clock,
      });
    },
  );

  it('shares the same repository reference with every use case', async () => {
    await createTestingModule();

    for (const useCaseConstructor of useCaseConstructors) {
      expect(getComposedDependencies(useCaseConstructor).repository).toBe(
        repository,
      );
    }
  });

  it('shares one StateTransition across all transition use cases', async () => {
    await createTestingModule();

    for (const useCaseConstructor of transitionUseCaseConstructors) {
      expect(getComposedDependencies(useCaseConstructor).stateTransition).toBe(
        stateTransition,
      );
    }
  });

  it('shares one Clock across all eight use cases', async () => {
    const module = await createTestingModule();
    const clock = module.get<Clock>(PAYMENT_NOTIFICATION_CLOCK);

    for (const useCaseConstructor of useCaseConstructors) {
      expect(getComposedDependencies(useCaseConstructor).clock).toBe(clock);
    }
  });

  it('creates StateTransition exactly once per container', async () => {
    const module = await createTestingModule();

    module.get(PAYMENT_NOTIFICATION_STATE_TRANSITION);
    module.get(PAYMENT_NOTIFICATION_STATE_TRANSITION);

    expect(createStateTransition).toHaveBeenCalledTimes(1);
    expect(createStateTransition).toHaveBeenCalledWith();
  });

  it('executes every use-case factory exactly once per container', async () => {
    const module = await createTestingModule();

    for (const token of useCaseTokens) {
      module.get(token);
      module.get(token);
    }

    for (const useCaseConstructor of useCaseConstructors) {
      expect(useCaseConstructor).toHaveBeenCalledTimes(1);
    }
  });

  it('returns the same use-case instance when a token is resolved twice', async () => {
    const module = await createTestingModule();

    for (const token of useCaseTokens) {
      expect(module.get(token)).toBe(module.get(token));
    }
  });

  it('keeps Clock and StateTransition internal to the module', () => {
    const exportedTokens = Reflect.getMetadata(
      'exports',
      PaymentNotificationsModule,
    ) as unknown[];

    expect(exportedTokens).not.toContain(PAYMENT_NOTIFICATION_CLOCK);
    expect(exportedTokens).not.toContain(PAYMENT_NOTIFICATION_STATE_TRANSITION);
    expect(exportedTokens).not.toContain(AZURE_ACCESS_TOKEN_PROVIDER);
    expect(exportedTokens).not.toContain(DATAVERSE_ACCESS_TOKEN_PROVIDER);
  });

  it('imports DataverseModule without declaring transversal providers', () => {
    const imports = Reflect.getMetadata(
      'imports',
      PaymentNotificationsModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      'providers',
      PaymentNotificationsModule,
    ) as unknown[];

    expect(imports).toEqual([DataverseModule]);
    expect(providers).not.toContain(azureAccessTokenProviderDefinition);
    expect(providers).not.toContain(dataverseAccessTokenProviderDefinition);
  });

  it('passes configured Client Credentials to Azure Identity', async () => {
    await createTestingModule();

    expect(createAzureAccessTokenProvider).toHaveBeenCalledWith({
      tenantId: 'test-tenant-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    });
  });

  it('injects AzureAccessTokenProvider into Dataverse Auth', async () => {
    await createTestingModule();

    expect(dataverseAccessTokenProviderDefinition.inject).toEqual([
      AZURE_ACCESS_TOKEN_PROVIDER,
    ]);
    expect(createDataverseAccessTokenProvider).toHaveBeenCalledWith({
      environmentUrl: ' https://example.crm.dynamics.com/// ',
      azureAccessTokenProvider,
    });
  });

  it('composes a normalized Dataverse Web API baseUrl', async () => {
    await createTestingModule();

    expect(
      jest.mocked(createDataversePaymentNotificationRepository).mock
        .calls[0]?.[0].baseUrl,
    ).toBe('https://example.crm.dynamics.com/api/data/v9.2');
  });

  it('passes the configured physical schema by reference', async () => {
    await createTestingModule();

    expect(
      jest.mocked(createDataversePaymentNotificationRepository).mock
        .calls[0]?.[0].schema,
    ).toBe(schema);
  });

  it('delegates repository token acquisition to DataverseAccessTokenProvider', async () => {
    await createTestingModule();
    const getAccessToken = jest.mocked(
      createDataversePaymentNotificationRepository,
    ).mock.calls[0]?.[0].getAccessToken;

    await expect(getAccessToken?.()).resolves.toBe('dataverse-access-token');
    expect(dataverseAccessTokenProvider.getAccessToken).toHaveBeenCalledTimes(
      1,
    );
  });

  it('exports PAYMENT_NOTIFICATION_REPOSITORY for consumer modules', async () => {
    @Module({ imports: [PaymentNotificationsModule] })
    class ConsumerModule {}

    const module = await Test.createTestingModule({
      imports: [ConsumerModule],
    }).compile();

    expect(module.get(PAYMENT_NOTIFICATION_REPOSITORY)).toBe(repository);
  });

  it('is imported exactly once from AppModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];

    expect(
      imports.filter((module) => module === PaymentNotificationsModule),
    ).toHaveLength(1);
  });

  it('creates each dependency exactly once per NestJS container', async () => {
    const module = await createTestingModule();

    module.get(AZURE_ACCESS_TOKEN_PROVIDER);
    module.get(AZURE_ACCESS_TOKEN_PROVIDER);
    module.get(DATAVERSE_ACCESS_TOKEN_PROVIDER);
    module.get(DATAVERSE_ACCESS_TOKEN_PROVIDER);
    module.get(PAYMENT_NOTIFICATION_REPOSITORY);
    module.get(PAYMENT_NOTIFICATION_REPOSITORY);

    expect(createAzureAccessTokenProvider).toHaveBeenCalledTimes(1);
    expect(createDataverseAccessTokenProvider).toHaveBeenCalledTimes(1);
    expect(createDataversePaymentNotificationRepository).toHaveBeenCalledTimes(
      1,
    );
  });

  it('uses the expected injection chain', () => {
    expect(azureAccessTokenProviderDefinition.inject).toBeUndefined();
    expect(paymentNotificationStateTransitionProviderDefinition.provide).toBe(
      PAYMENT_NOTIFICATION_STATE_TRANSITION,
    );
    expect(
      paymentNotificationStateTransitionProviderDefinition.inject,
    ).toBeUndefined();
    expect(dataverseAccessTokenProviderDefinition.inject).toEqual([
      AZURE_ACCESS_TOKEN_PROVIDER,
    ]);
    expect(paymentNotificationRepositoryProviderDefinition.inject).toEqual([
      DATAVERSE_ACCESS_TOKEN_PROVIDER,
    ]);
    expect(
      createDraftPaymentNotificationUseCaseProviderDefinition.inject,
    ).toEqual([PAYMENT_NOTIFICATION_REPOSITORY, PAYMENT_NOTIFICATION_CLOCK]);
    expect(updatePaymentNotificationUseCaseProviderDefinition.inject).toEqual([
      PAYMENT_NOTIFICATION_REPOSITORY,
      PAYMENT_NOTIFICATION_CLOCK,
    ]);

    for (const providerDefinition of [
      submitPaymentNotificationUseCaseProviderDefinition,
      startReviewPaymentNotificationUseCaseProviderDefinition,
      validatePaymentNotificationUseCaseProviderDefinition,
      rejectPaymentNotificationUseCaseProviderDefinition,
      requestChangesPaymentNotificationUseCaseProviderDefinition,
      resubmitPaymentNotificationUseCaseProviderDefinition,
    ]) {
      expect(providerDefinition.inject).toEqual([
        PAYMENT_NOTIFICATION_REPOSITORY,
        PAYMENT_NOTIFICATION_STATE_TRANSITION,
        PAYMENT_NOTIFICATION_CLOCK,
      ]);
    }
  });

  it('does not perform HTTP requests or acquire tokens during composition', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    try {
      await createTestingModule();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(
        dataverseAccessTokenProvider.getAccessToken,
      ).not.toHaveBeenCalled();
      expect(azureAccessTokenProvider.getAccessToken).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('propagates clear startup configuration errors without secrets', async () => {
    const configurationError = new Error(
      'Missing required environment variables: AZURE_CLIENT_SECRET',
    );
    jest.mocked(getAppConfig).mockImplementation(() => {
      throw configurationError;
    });

    let thrownError: unknown;
    try {
      await createTestingModule();
    } catch (error: unknown) {
      thrownError = error;
    }

    expect(thrownError).toBe(configurationError);
    expect((thrownError as Error).message).not.toContain('test-client-secret');
  });

  it('does not modify configuration objects', async () => {
    const originalConfig = structuredClone(config);

    await createTestingModule();

    expect(config).toEqual(originalConfig);
    expect(
      jest.mocked(createDataversePaymentNotificationRepository).mock
        .calls[0]?.[0].schema,
    ).toBe(schema);
  });

  it('does not read process.env or use incoming JWT authentication', () => {
    expect(productionSource).not.toMatch(
      /process\.env|JwtStrategy|passport|authorization|bearer/i,
    );
  });

  it('does not embed physical Dataverse names in production code', () => {
    expect(productionSource).not.toMatch(
      /test_notifications|test_notification_id|crm\.dynamics\.com/i,
    );
  });

  it('does not declare controllers or endpoints', () => {
    const controllers = Reflect.getMetadata(
      'controllers',
      PaymentNotificationsModule,
    ) as unknown[] | undefined;

    expect(controllers ?? []).toEqual([]);
    expect(productionSource).not.toMatch(
      /@Controller|@(Get|Post|Put|Patch|Delete)\(/,
    );
  });
});
