import type { FactoryProvider, Provider } from '@nestjs/common';
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
  type DataverseFinanceQueryClient,
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

import {
  createDataverseBaseUrl,
  DATAVERSE_ACCESS_TOKEN_PROVIDER,
} from '../dataverse';
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

const BUSINESS_CENTRAL_AZURE_ACCESS_TOKEN_PROVIDER = Symbol(
  'BUSINESS_CENTRAL_AZURE_ACCESS_TOKEN_PROVIDER',
);

export const businessCentralAzureAccessTokenProviderDefinition: FactoryProvider<AzureAccessTokenProvider> =
  {
    provide: BUSINESS_CENTRAL_AZURE_ACCESS_TOKEN_PROVIDER,
    useFactory: () => {
      const { tenantId, clientId, clientSecret } =
        getAppConfig().businessCentral;

      return createAzureAccessTokenProvider({
        tenantId,
        clientId,
        clientSecret,
      });
    },
  };

export const businessCentralAccessTokenProviderDefinition: FactoryProvider<BusinessCentralAccessTokenProvider> =
  {
    provide: BUSINESS_CENTRAL_ACCESS_TOKEN_PROVIDER,
    inject: [BUSINESS_CENTRAL_AZURE_ACCESS_TOKEN_PROVIDER],
    useFactory: (azureAccessTokenProvider: AzureAccessTokenProvider) => {
      const { resourceUrl } = getAppConfig().businessCentral;

      return createBusinessCentralAccessTokenProvider({
        resourceUrl,
        azureAccessTokenProvider,
      });
    },
  };

export const businessCentralHttpClientProviderDefinition: FactoryProvider<BusinessCentralHttpClient> =
  {
    provide: BUSINESS_CENTRAL_HTTP_CLIENT,
    inject: [BUSINESS_CENTRAL_ACCESS_TOKEN_PROVIDER],
    useFactory: (
      businessCentralAccessTokenProvider: BusinessCentralAccessTokenProvider,
    ) => {
      const { resourceUrl, tenantId, environmentName, apiVersion, companyId } =
        getAppConfig().businessCentral;

      return new FetchBusinessCentralClient({
        companyBaseUrl: createBusinessCentralCompanyBaseUrl({
          resourceUrl,
          tenantId,
          environmentName,
          apiVersion,
          companyId,
        }),
        getAccessToken: () =>
          businessCentralAccessTokenProvider.getAccessToken(),
      });
    },
  };

export const businessCentralInvoiceGatewayProviderDefinition: FactoryProvider<BusinessCentralInvoiceGateway> =
  {
    provide: BUSINESS_CENTRAL_INVOICE_GATEWAY,
    inject: [BUSINESS_CENTRAL_HTTP_CLIENT],
    useFactory: (client: BusinessCentralHttpClient) =>
      new StandardApiBusinessCentralInvoiceGateway(client),
  };

export const businessCentralCreditMemoGatewayProviderDefinition: FactoryProvider<BusinessCentralCreditMemoGateway> =
  {
    provide: BUSINESS_CENTRAL_CREDIT_MEMO_GATEWAY,
    inject: [BUSINESS_CENTRAL_HTTP_CLIENT],
    useFactory: (client: BusinessCentralHttpClient) =>
      new StandardApiBusinessCentralCreditMemoGateway(client),
  };

export const financeInvoiceRepositoryProviderDefinition: FactoryProvider<InvoiceRepository> =
  {
    provide: FINANCE_INVOICE_REPOSITORY,
    inject: [BUSINESS_CENTRAL_INVOICE_GATEWAY],
    useFactory: (gateway: BusinessCentralInvoiceGateway) =>
      new BusinessCentralInvoiceRepository(gateway),
  };

export const financeCreditMemoRepositoryProviderDefinition: FactoryProvider<CreditMemoRepository> =
  {
    provide: FINANCE_CREDIT_MEMO_REPOSITORY,
    inject: [BUSINESS_CENTRAL_CREDIT_MEMO_GATEWAY],
    useFactory: (gateway: BusinessCentralCreditMemoGateway) =>
      new BusinessCentralCreditMemoRepository(gateway),
  };

export const financeCustomerReferenceDataverseClientProviderDefinition: FactoryProvider<DataverseClient> =
  {
    provide: FINANCE_CUSTOMER_REFERENCE_DATAVERSE_CLIENT,
    inject: [DATAVERSE_ACCESS_TOKEN_PROVIDER],
    useFactory: (
      dataverseAccessTokenProvider: DataverseAccessTokenProvider,
    ) => {
      const { environmentUrl, apiVersion } = getAppConfig().dataverse;

      return new FetchDataverseClient({
        baseUrl: createDataverseBaseUrl(environmentUrl, apiVersion),
        getAccessToken: () => dataverseAccessTokenProvider.getAccessToken(),
      });
    },
  };

export const financeCustomerReferenceGatewayProviderDefinition: FactoryProvider<FinanceCustomerReferenceGateway> =
  {
    provide: FINANCE_CUSTOMER_REFERENCE_GATEWAY,
    inject: [FINANCE_CUSTOMER_REFERENCE_DATAVERSE_CLIENT],
    useFactory: (client: DataverseFinanceQueryClient) =>
      new DataverseFinanceCustomerReferenceGateway({
        client,
        schema: getAppConfig().dataverse.finance.customerReference.schema,
      }),
  };

export const financeCustomerReferenceResolverProviderDefinition: FactoryProvider<CustomerBusinessCentralReferenceResolver> =
  {
    provide: FINANCE_CUSTOMER_REFERENCE_RESOLVER,
    inject: [FINANCE_CUSTOMER_REFERENCE_GATEWAY],
    useFactory: (gateway: FinanceCustomerReferenceGateway) =>
      new DataverseCustomerBusinessCentralReferenceResolver(gateway),
  };

export const getFinanceInvoiceByIdUseCaseProviderDefinition: FactoryProvider<GetInvoiceByIdUseCase> =
  {
    provide: GET_FINANCE_INVOICE_BY_ID_USE_CASE,
    inject: [FINANCE_INVOICE_REPOSITORY, FINANCE_CUSTOMER_REFERENCE_RESOLVER],
    useFactory: (
      invoiceRepository: InvoiceRepository,
      customerReferenceResolver: CustomerBusinessCentralReferenceResolver,
    ) =>
      new GetInvoiceByIdUseCase({
        invoiceRepository,
        customerReferenceResolver,
      }),
  };

export const listCustomerFinanceInvoicesUseCaseProviderDefinition: FactoryProvider<ListCustomerInvoicesUseCase> =
  {
    provide: LIST_CUSTOMER_FINANCE_INVOICES_USE_CASE,
    inject: [FINANCE_INVOICE_REPOSITORY, FINANCE_CUSTOMER_REFERENCE_RESOLVER],
    useFactory: (
      invoiceRepository: InvoiceRepository,
      customerReferenceResolver: CustomerBusinessCentralReferenceResolver,
    ) =>
      new ListCustomerInvoicesUseCase({
        invoiceRepository,
        customerReferenceResolver,
      }),
  };

export const getFinanceCreditMemoByIdUseCaseProviderDefinition: FactoryProvider<GetCreditMemoByIdUseCase> =
  {
    provide: GET_FINANCE_CREDIT_MEMO_BY_ID_USE_CASE,
    inject: [
      FINANCE_CREDIT_MEMO_REPOSITORY,
      FINANCE_CUSTOMER_REFERENCE_RESOLVER,
    ],
    useFactory: (
      creditMemoRepository: CreditMemoRepository,
      customerReferenceResolver: CustomerBusinessCentralReferenceResolver,
    ) =>
      new GetCreditMemoByIdUseCase({
        creditMemoRepository,
        customerReferenceResolver,
      }),
  };

export const listCustomerFinanceCreditMemosUseCaseProviderDefinition: FactoryProvider<ListCustomerCreditMemosUseCase> =
  {
    provide: LIST_CUSTOMER_FINANCE_CREDIT_MEMOS_USE_CASE,
    inject: [
      FINANCE_CREDIT_MEMO_REPOSITORY,
      FINANCE_CUSTOMER_REFERENCE_RESOLVER,
    ],
    useFactory: (
      creditMemoRepository: CreditMemoRepository,
      customerReferenceResolver: CustomerBusinessCentralReferenceResolver,
    ) =>
      new ListCustomerCreditMemosUseCase({
        creditMemoRepository,
        customerReferenceResolver,
      }),
  };

// Opti ChatGPT: composición singleton para reutilizar clientes, gateways, repositorios y resolver.
export const FINANCE_PROVIDERS: Provider[] = [
  businessCentralAzureAccessTokenProviderDefinition,
  businessCentralAccessTokenProviderDefinition,
  businessCentralHttpClientProviderDefinition,
  businessCentralInvoiceGatewayProviderDefinition,
  businessCentralCreditMemoGatewayProviderDefinition,
  financeInvoiceRepositoryProviderDefinition,
  financeCreditMemoRepositoryProviderDefinition,
  financeCustomerReferenceDataverseClientProviderDefinition,
  financeCustomerReferenceGatewayProviderDefinition,
  financeCustomerReferenceResolverProviderDefinition,
  getFinanceInvoiceByIdUseCaseProviderDefinition,
  listCustomerFinanceInvoicesUseCaseProviderDefinition,
  getFinanceCreditMemoByIdUseCaseProviderDefinition,
  listCustomerFinanceCreditMemosUseCaseProviderDefinition,
];
