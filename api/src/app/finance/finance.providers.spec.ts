import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { FactoryProvider } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getAppConfig } from '@nexus/config';
import {
  BusinessCentralCreditMemoRepository,
  BusinessCentralInvoiceRepository,
  DataverseCustomerBusinessCentralReferenceResolver,
  DataverseFinanceCustomerReferenceGateway,
  GetCreditMemoByIdUseCase,
  GetInvoiceByIdUseCase,
  ListCustomerCreditMemosUseCase,
  ListCustomerInvoicesUseCase,
  type CreditMemoRepository,
  type CustomerBusinessCentralReferenceResolver,
  type FinanceCustomerReferenceGateway,
  type InvoiceRepository,
} from '@nexus/modules/finance';
import {
  FetchDataverseClient,
  type DataverseClient,
} from '@nexus/modules/payment-notifications/infrastructure';
import {
  createAzureAccessTokenProvider,
  createBusinessCentralAccessTokenProvider,
  createBusinessCentralCompanyBaseUrl,
  FetchBusinessCentralClient,
  StandardApiBusinessCentralCreditMemoGateway,
  StandardApiBusinessCentralInvoiceGateway,
  type AzureAccessTokenProvider,
  type BusinessCentralAccessTokenProvider,
  type BusinessCentralCreditMemoGateway,
  type BusinessCentralHttpClient,
  type BusinessCentralInvoiceGateway,
  type DataverseAccessTokenProvider,
} from '@nexus/platform';

import { AppModule } from '../app.module';
import { DATAVERSE_ACCESS_TOKEN_PROVIDER, DataverseModule } from '../dataverse';
import { AuthenticatedActorModule } from '../authenticated-actor';
import { PaymentNotificationsModule } from '../payment-notifications';
import { FinanceController } from './controllers';
import { FinanceModule } from './finance.module';
import {
  FINANCE_PROVIDERS,
  businessCentralAccessTokenProviderDefinition,
  businessCentralAzureAccessTokenProviderDefinition,
  businessCentralCreditMemoGatewayProviderDefinition,
  businessCentralHttpClientProviderDefinition,
  businessCentralInvoiceGatewayProviderDefinition,
  financeCreditMemoRepositoryProviderDefinition,
  financeCustomerReferenceDataverseClientProviderDefinition,
  financeCustomerReferenceGatewayProviderDefinition,
  financeCustomerReferenceResolverProviderDefinition,
  financeInvoiceRepositoryProviderDefinition,
  getFinanceCreditMemoByIdUseCaseProviderDefinition,
  getFinanceInvoiceByIdUseCaseProviderDefinition,
  listCustomerFinanceCreditMemosUseCaseProviderDefinition,
  listCustomerFinanceInvoicesUseCaseProviderDefinition,
} from './finance.providers';
import {
  BUSINESS_CENTRAL_ACCESS_TOKEN_PROVIDER,
  BUSINESS_CENTRAL_CREDIT_MEMO_GATEWAY,
  BUSINESS_CENTRAL_HTTP_CLIENT,
  BUSINESS_CENTRAL_INVOICE_GATEWAY,
  FINANCE_CREDIT_MEMO_REPOSITORY,
  FINANCE_CUSTOMER_REFERENCE_DATAVERSE_CLIENT,
  FINANCE_CUSTOMER_REFERENCE_GATEWAY,
  FINANCE_CUSTOMER_REFERENCE_RESOLVER,
  FINANCE_INVOICE_REPOSITORY,
  GET_FINANCE_CREDIT_MEMO_BY_ID_USE_CASE,
  GET_FINANCE_INVOICE_BY_ID_USE_CASE,
  LIST_CUSTOMER_FINANCE_CREDIT_MEMOS_USE_CASE,
  LIST_CUSTOMER_FINANCE_INVOICES_USE_CASE,
} from './finance.tokens';

jest.mock('@nexus/config', () => ({
  getAppConfig: jest.fn(),
}));

jest.mock('@nexus/modules/payment-notifications/infrastructure', () => ({
  FetchDataverseClient: jest.fn(),
}));

jest.mock('@nexus/modules/finance', () => ({
  BusinessCentralCreditMemoRepository: jest.fn(),
  BusinessCentralInvoiceRepository: jest.fn(),
  DataverseCustomerBusinessCentralReferenceResolver: jest.fn(),
  DataverseFinanceCustomerReferenceGateway: jest.fn(),
  GetCreditMemoByIdUseCase: jest.fn(),
  GetInvoiceByIdUseCase: jest.fn(),
  ListCustomerCreditMemosUseCase: jest.fn(),
  ListCustomerInvoicesUseCase: jest.fn(),
}));

jest.mock('@nexus/platform', () => ({
  createAzureAccessTokenProvider: jest.fn(),
  createBusinessCentralAccessTokenProvider: jest.fn(),
  createBusinessCentralCompanyBaseUrl: jest.fn(),
  FetchBusinessCentralClient: jest.fn(),
  StandardApiBusinessCentralCreditMemoGateway: jest.fn(),
  StandardApiBusinessCentralInvoiceGateway: jest.fn(),
}));

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn(() => jest.fn()),
}));

const customerReferenceSchema = Object.freeze({
  customerEntitySet: 'test_customer_entities',
  customerFields: Object.freeze({
    nexusCustomerId: 'test_nexus_customer_id',
    businessCentralCustomerId: 'test_bc_customer_id',
    active: 'test_active',
  }),
});

const config = {
  azure: Object.freeze({
    tenantId: 'dataverse-tenant',
    clientId: 'dataverse-client',
    clientSecret: 'synthetic-dataverse-credential',
  }),
  businessCentral: Object.freeze({
    tenantId: 'bc-tenant',
    clientId: 'bc-client',
    clientSecret: 'synthetic-bc-credential',
    resourceUrl: 'https://api.businesscentral.dynamics.com',
    environmentName: 'test-environment',
    apiVersion: 'v2.0',
    companyId: 'test-company',
  }),
  dataverse: Object.freeze({
    environmentUrl: 'https://example.crm.dynamics.com',
    apiVersion: 'v9.2',
    finance: Object.freeze({
      customerReference: Object.freeze({
        schema: customerReferenceSchema,
      }),
    }),
  }),
} as unknown as ReturnType<typeof getAppConfig>;

const businessCentralAzureAccessTokenProvider: AzureAccessTokenProvider =
  Object.freeze({
    getAccessToken: jest.fn(),
  });

const businessCentralAccessTokenProvider: BusinessCentralAccessTokenProvider =
  Object.freeze({
    getAccessToken: jest.fn().mockResolvedValue('synthetic-bc-token'),
  });

const dataverseAccessTokenProvider: DataverseAccessTokenProvider =
  Object.freeze({
    getAccessToken: jest.fn().mockResolvedValue('synthetic-dataverse-token'),
  });

const businessCentralClient: BusinessCentralHttpClient = Object.freeze({
  getOne: jest.fn(),
  query: jest.fn(),
});

const invoiceGateway: BusinessCentralInvoiceGateway = Object.freeze({
  findById: jest.fn(),
  findByCustomer: jest.fn(),
});

const creditMemoGateway: BusinessCentralCreditMemoGateway = Object.freeze({
  findById: jest.fn(),
  findByCustomer: jest.fn(),
});

const invoiceRepository: InvoiceRepository = Object.freeze({
  findById: jest.fn(),
  findByBusinessCentralCustomerId: jest.fn(),
});

const creditMemoRepository: CreditMemoRepository = Object.freeze({
  findById: jest.fn(),
  findByBusinessCentralCustomerId: jest.fn(),
});

const dataverseClient: DataverseClient = Object.freeze({
  create: jest.fn(),
  update: jest.fn(),
  deleteWhere: jest.fn(),
  findOne: jest.fn(),
  query: jest.fn(),
  executeAtomic: jest.fn(),
});

const customerReferenceGateway: FinanceCustomerReferenceGateway = Object.freeze(
  {
    findByNexusCustomerId: jest.fn(),
  },
);

const customerReferenceResolver: CustomerBusinessCentralReferenceResolver =
  Object.freeze({
    resolveByNexusCustomerId: jest.fn(),
  });

const getInvoiceByIdUseCase = Object.freeze({ execute: jest.fn() });
const listCustomerInvoicesUseCase = Object.freeze({ execute: jest.fn() });
const getCreditMemoByIdUseCase = Object.freeze({ execute: jest.fn() });
const listCustomerCreditMemosUseCase = Object.freeze({ execute: jest.fn() });

const publicTokens = [
  BUSINESS_CENTRAL_ACCESS_TOKEN_PROVIDER,
  BUSINESS_CENTRAL_HTTP_CLIENT,
  BUSINESS_CENTRAL_INVOICE_GATEWAY,
  BUSINESS_CENTRAL_CREDIT_MEMO_GATEWAY,
  FINANCE_INVOICE_REPOSITORY,
  FINANCE_CREDIT_MEMO_REPOSITORY,
  FINANCE_CUSTOMER_REFERENCE_DATAVERSE_CLIENT,
  FINANCE_CUSTOMER_REFERENCE_GATEWAY,
  FINANCE_CUSTOMER_REFERENCE_RESOLVER,
  GET_FINANCE_INVOICE_BY_ID_USE_CASE,
  LIST_CUSTOMER_FINANCE_INVOICES_USE_CASE,
  GET_FINANCE_CREDIT_MEMO_BY_ID_USE_CASE,
  LIST_CUSTOMER_FINANCE_CREDIT_MEMOS_USE_CASE,
] as const;

const useCaseTokens = [
  GET_FINANCE_INVOICE_BY_ID_USE_CASE,
  LIST_CUSTOMER_FINANCE_INVOICES_USE_CASE,
  GET_FINANCE_CREDIT_MEMO_BY_ID_USE_CASE,
  LIST_CUSTOMER_FINANCE_CREDIT_MEMOS_USE_CASE,
] as const;

const productionSource = [
  'finance.tokens.ts',
  'finance.providers.ts',
  'finance.module.ts',
]
  .map((fileName) => readFileSync(join(__dirname, fileName), 'utf8'))
  .join('\n');

async function createTestingModule() {
  return Test.createTestingModule({
    providers: [
      {
        provide: DATAVERSE_ACCESS_TOKEN_PROVIDER,
        useValue: dataverseAccessTokenProvider,
      },
      ...FINANCE_PROVIDERS,
    ],
  }).compile();
}

describe('Finance providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAppConfig).mockReturnValue(config);
    jest
      .mocked(createAzureAccessTokenProvider)
      .mockReturnValue(businessCentralAzureAccessTokenProvider);
    jest
      .mocked(createBusinessCentralAccessTokenProvider)
      .mockReturnValue(businessCentralAccessTokenProvider);
    jest
      .mocked(createBusinessCentralCompanyBaseUrl)
      .mockReturnValue('https://business-central.test/company');
    jest
      .mocked(FetchBusinessCentralClient)
      .mockImplementation(
        () => businessCentralClient as FetchBusinessCentralClient,
      );
    jest
      .mocked(StandardApiBusinessCentralInvoiceGateway)
      .mockImplementation(
        () => invoiceGateway as StandardApiBusinessCentralInvoiceGateway,
      );
    jest
      .mocked(StandardApiBusinessCentralCreditMemoGateway)
      .mockImplementation(
        () => creditMemoGateway as StandardApiBusinessCentralCreditMemoGateway,
      );
    jest
      .mocked(BusinessCentralInvoiceRepository)
      .mockImplementation(
        () => invoiceRepository as BusinessCentralInvoiceRepository,
      );
    jest
      .mocked(BusinessCentralCreditMemoRepository)
      .mockImplementation(
        () => creditMemoRepository as BusinessCentralCreditMemoRepository,
      );
    jest
      .mocked(FetchDataverseClient)
      .mockImplementation(() => dataverseClient as FetchDataverseClient);
    jest
      .mocked(DataverseFinanceCustomerReferenceGateway)
      .mockImplementation(
        () =>
          customerReferenceGateway as DataverseFinanceCustomerReferenceGateway,
      );
    jest
      .mocked(DataverseCustomerBusinessCentralReferenceResolver)
      .mockImplementation(
        () =>
          customerReferenceResolver as DataverseCustomerBusinessCentralReferenceResolver,
      );
    jest
      .mocked(GetInvoiceByIdUseCase)
      .mockImplementation(
        () => getInvoiceByIdUseCase as unknown as GetInvoiceByIdUseCase,
      );
    jest
      .mocked(ListCustomerInvoicesUseCase)
      .mockImplementation(
        () =>
          listCustomerInvoicesUseCase as unknown as ListCustomerInvoicesUseCase,
      );
    jest
      .mocked(GetCreditMemoByIdUseCase)
      .mockImplementation(
        () => getCreditMemoByIdUseCase as unknown as GetCreditMemoByIdUseCase,
      );
    jest
      .mocked(ListCustomerCreditMemosUseCase)
      .mockImplementation(
        () =>
          listCustomerCreditMemosUseCase as unknown as ListCustomerCreditMemosUseCase,
      );
  });

  it('defines every public provider token as a Symbol and registers it', async () => {
    const module = await createTestingModule();
    const registeredTokens = FINANCE_PROVIDERS.map(
      (provider) => (provider as FactoryProvider).provide,
    );

    for (const token of publicTokens) {
      expect(typeof token).toBe('symbol');
      expect(registeredTokens).toContain(token);
      expect(module.get(token)).toBeDefined();
    }
  });

  it('exports only the four Finance use cases', () => {
    const exports = Reflect.getMetadata('exports', FinanceModule) as unknown[];

    expect(exports).toEqual(useCaseTokens);
  });

  it('imports DataverseModule and registers FinanceController', () => {
    expect(Reflect.getMetadata('imports', FinanceModule)).toEqual([
      DataverseModule,
    ]);
    expect(Reflect.getMetadata('controllers', FinanceModule)).toEqual([
      FinanceController,
    ]);
  });

  it('is imported exactly once from AppModule without replacing existing modules', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];

    expect(imports.filter((item) => item === FinanceModule)).toHaveLength(1);
    expect(imports).toContain(PaymentNotificationsModule);
    expect(imports).toContain(AuthenticatedActorModule);
  });

  it('uses only Business Central credentials for its Azure provider', async () => {
    await createTestingModule();

    expect(createAzureAccessTokenProvider).toHaveBeenCalledWith({
      tenantId: config.businessCentral.tenantId,
      clientId: config.businessCentral.clientId,
      clientSecret: config.businessCentral.clientSecret,
    });
    expect(createAzureAccessTokenProvider).not.toHaveBeenCalledWith(
      expect.objectContaining(config.azure),
    );
  });

  it('composes the Business Central token provider and company URL', async () => {
    await createTestingModule();

    expect(createBusinessCentralAccessTokenProvider).toHaveBeenCalledWith({
      resourceUrl: config.businessCentral.resourceUrl,
      azureAccessTokenProvider: businessCentralAzureAccessTokenProvider,
    });
    expect(createBusinessCentralCompanyBaseUrl).toHaveBeenCalledWith({
      resourceUrl: config.businessCentral.resourceUrl,
      tenantId: config.businessCentral.tenantId,
      environmentName: config.businessCentral.environmentName,
      apiVersion: config.businessCentral.apiVersion,
      companyId: config.businessCentral.companyId,
    });
  });

  it('delegates Business Central token acquisition without acquiring during composition', async () => {
    await createTestingModule();
    const dependencies = jest.mocked(FetchBusinessCentralClient).mock
      .calls[0]?.[0];

    expect(
      businessCentralAccessTokenProvider.getAccessToken,
    ).not.toHaveBeenCalled();
    await expect(dependencies?.getAccessToken()).resolves.toBe(
      'synthetic-bc-token',
    );
    expect(
      businessCentralAccessTokenProvider.getAccessToken,
    ).toHaveBeenCalledTimes(1);
  });

  it('shares the Business Central client and wires each repository to its gateway', async () => {
    await createTestingModule();

    expect(StandardApiBusinessCentralInvoiceGateway).toHaveBeenCalledWith(
      businessCentralClient,
    );
    expect(StandardApiBusinessCentralCreditMemoGateway).toHaveBeenCalledWith(
      businessCentralClient,
    );
    expect(BusinessCentralInvoiceRepository).toHaveBeenCalledWith(
      invoiceGateway,
    );
    expect(BusinessCentralCreditMemoRepository).toHaveBeenCalledWith(
      creditMemoGateway,
    );
  });

  it('uses the transversal Dataverse provider and passes the configured schema unchanged', async () => {
    await createTestingModule();

    expect(FetchDataverseClient).toHaveBeenCalledWith({
      baseUrl: 'https://example.crm.dynamics.com/api/data/v9.2',
      getAccessToken: expect.any(Function),
    });
    expect(DataverseFinanceCustomerReferenceGateway).toHaveBeenCalledWith({
      client: dataverseClient,
      schema: customerReferenceSchema,
    });
    expect(
      DataverseCustomerBusinessCentralReferenceResolver,
    ).toHaveBeenCalledWith(customerReferenceGateway);
  });

  it('delegates Dataverse token acquisition to the transversal provider', async () => {
    await createTestingModule();
    const dependencies = jest.mocked(FetchDataverseClient).mock.calls[0]?.[0];

    expect(dataverseAccessTokenProvider.getAccessToken).not.toHaveBeenCalled();
    await expect(dependencies?.getAccessToken()).resolves.toBe(
      'synthetic-dataverse-token',
    );
    expect(dataverseAccessTokenProvider.getAccessToken).toHaveBeenCalledTimes(
      1,
    );
  });

  it('wires all four use cases to the correct repository and shared resolver', async () => {
    await createTestingModule();

    const invoiceDependencies = {
      invoiceRepository,
      customerReferenceResolver,
    };
    const creditMemoDependencies = {
      creditMemoRepository,
      customerReferenceResolver,
    };

    expect(GetInvoiceByIdUseCase).toHaveBeenCalledWith(invoiceDependencies);
    expect(ListCustomerInvoicesUseCase).toHaveBeenCalledWith(
      invoiceDependencies,
    );
    expect(GetCreditMemoByIdUseCase).toHaveBeenCalledWith(
      creditMemoDependencies,
    );
    expect(ListCustomerCreditMemosUseCase).toHaveBeenCalledWith(
      creditMemoDependencies,
    );
  });

  it('returns the same singleton whenever each public token is resolved', async () => {
    const module = await createTestingModule();

    for (const token of publicTokens) {
      expect(module.get(token)).toBe(module.get(token));
    }
  });

  it('executes every singleton factory exactly once', async () => {
    const module = await createTestingModule();

    for (const token of publicTokens) {
      module.get(token);
      module.get(token);
    }

    expect(createAzureAccessTokenProvider).toHaveBeenCalledTimes(1);
    expect(createBusinessCentralAccessTokenProvider).toHaveBeenCalledTimes(1);
    expect(FetchBusinessCentralClient).toHaveBeenCalledTimes(1);
    expect(StandardApiBusinessCentralInvoiceGateway).toHaveBeenCalledTimes(1);
    expect(StandardApiBusinessCentralCreditMemoGateway).toHaveBeenCalledTimes(
      1,
    );
    expect(BusinessCentralInvoiceRepository).toHaveBeenCalledTimes(1);
    expect(BusinessCentralCreditMemoRepository).toHaveBeenCalledTimes(1);
    expect(FetchDataverseClient).toHaveBeenCalledTimes(1);
    expect(DataverseFinanceCustomerReferenceGateway).toHaveBeenCalledTimes(1);
    expect(
      DataverseCustomerBusinessCentralReferenceResolver,
    ).toHaveBeenCalledTimes(1);
    expect(GetInvoiceByIdUseCase).toHaveBeenCalledTimes(1);
    expect(ListCustomerInvoicesUseCase).toHaveBeenCalledTimes(1);
    expect(GetCreditMemoByIdUseCase).toHaveBeenCalledTimes(1);
    expect(ListCustomerCreditMemosUseCase).toHaveBeenCalledTimes(1);
  });

  it('does not acquire tokens or perform external I/O during composition', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    await createTestingModule();

    expect(
      businessCentralAzureAccessTokenProvider.getAccessToken,
    ).not.toHaveBeenCalled();
    expect(
      businessCentralAccessTokenProvider.getAccessToken,
    ).not.toHaveBeenCalled();
    expect(dataverseAccessTokenProvider.getAccessToken).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(businessCentralClient.getOne).not.toHaveBeenCalled();
    expect(businessCentralClient.query).not.toHaveBeenCalled();
    expect(dataverseClient.query).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('keeps the required injection chains explicit', () => {
    expect(
      businessCentralAzureAccessTokenProviderDefinition.inject,
    ).toBeUndefined();
    expect(businessCentralAccessTokenProviderDefinition.inject).toHaveLength(1);
    expect(businessCentralHttpClientProviderDefinition.inject).toEqual([
      BUSINESS_CENTRAL_ACCESS_TOKEN_PROVIDER,
    ]);
    expect(businessCentralInvoiceGatewayProviderDefinition.inject).toEqual([
      BUSINESS_CENTRAL_HTTP_CLIENT,
    ]);
    expect(businessCentralCreditMemoGatewayProviderDefinition.inject).toEqual([
      BUSINESS_CENTRAL_HTTP_CLIENT,
    ]);
    expect(financeInvoiceRepositoryProviderDefinition.inject).toEqual([
      BUSINESS_CENTRAL_INVOICE_GATEWAY,
    ]);
    expect(financeCreditMemoRepositoryProviderDefinition.inject).toEqual([
      BUSINESS_CENTRAL_CREDIT_MEMO_GATEWAY,
    ]);
    expect(
      financeCustomerReferenceDataverseClientProviderDefinition.inject,
    ).toEqual([DATAVERSE_ACCESS_TOKEN_PROVIDER]);
    expect(financeCustomerReferenceGatewayProviderDefinition.inject).toEqual([
      FINANCE_CUSTOMER_REFERENCE_DATAVERSE_CLIENT,
    ]);
    expect(financeCustomerReferenceResolverProviderDefinition.inject).toEqual([
      FINANCE_CUSTOMER_REFERENCE_GATEWAY,
    ]);
    expect(getFinanceInvoiceByIdUseCaseProviderDefinition.inject).toEqual([
      FINANCE_INVOICE_REPOSITORY,
      FINANCE_CUSTOMER_REFERENCE_RESOLVER,
    ]);
    expect(listCustomerFinanceInvoicesUseCaseProviderDefinition.inject).toEqual(
      [FINANCE_INVOICE_REPOSITORY, FINANCE_CUSTOMER_REFERENCE_RESOLVER],
    );
    expect(getFinanceCreditMemoByIdUseCaseProviderDefinition.inject).toEqual([
      FINANCE_CREDIT_MEMO_REPOSITORY,
      FINANCE_CUSTOMER_REFERENCE_RESOLVER,
    ]);
    expect(
      listCustomerFinanceCreditMemosUseCaseProviderDefinition.inject,
    ).toEqual([
      FINANCE_CREDIT_MEMO_REPOSITORY,
      FINANCE_CUSTOMER_REFERENCE_RESOLVER,
    ]);
  });

  it('contains no incoming JWT, direct environment reads, Finance controllers, or fixed physical names', () => {
    expect(productionSource).not.toMatch(
      /JwtStrategy|passport|process\.env|@Controller|test_customer_entities|synthetic-/i,
    );
    expect(productionSource).not.toMatch(/getAppConfig\(\)\.azure/);
  });
});
