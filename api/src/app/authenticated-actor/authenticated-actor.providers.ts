import type { FactoryProvider, Provider } from '@nestjs/common';
import { getAppConfig } from '@nexus/config';
import {
  FetchDataverseClient,
  type DataverseClient,
} from '@nexus/modules/payment-notifications/infrastructure';
import {
  DataverseAuthenticatedActorGateway,
  DataverseAuthenticatedActorResolver,
  type AuthenticatedActorGateway,
  type AuthenticatedActorResolver,
  type DataverseAccessTokenProvider,
  type DataverseQueryClient,
} from '@nexus/platform';

import {
  createDataverseBaseUrl,
  DATAVERSE_ACCESS_TOKEN_PROVIDER,
} from '../dataverse';
import {
  AUTHENTICATED_ACTOR_DATAVERSE_CLIENT,
  AUTHENTICATED_ACTOR_GATEWAY,
  AUTHENTICATED_ACTOR_RESOLVER,
} from './authenticated-actor.tokens';

export const authenticatedActorDataverseClientProviderDefinition: FactoryProvider<DataverseClient> =
  {
    provide: AUTHENTICATED_ACTOR_DATAVERSE_CLIENT,
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

export const authenticatedActorGatewayProviderDefinition: FactoryProvider<AuthenticatedActorGateway> =
  {
    provide: AUTHENTICATED_ACTOR_GATEWAY,
    inject: [AUTHENTICATED_ACTOR_DATAVERSE_CLIENT],
    useFactory: (client: DataverseQueryClient) => {
      const authenticatedActor = getAppConfig().dataverse.authenticatedActor;

      if (authenticatedActor === undefined) {
        throw new Error(
          'Dataverse authenticatedActor configuration is required',
        );
      }

      return new DataverseAuthenticatedActorGateway({
        client,
        schema: authenticatedActor.schema,
      });
    },
  };

export const authenticatedActorResolverProviderDefinition: FactoryProvider<AuthenticatedActorResolver> =
  {
    provide: AUTHENTICATED_ACTOR_RESOLVER,
    inject: [AUTHENTICATED_ACTOR_GATEWAY],
    useFactory: (gateway: AuthenticatedActorGateway) =>
      new DataverseAuthenticatedActorResolver(gateway),
  };

// Opti ChatGPT: composición singleton para reutilizar cliente, gateway y resolver.
export const AUTHENTICATED_ACTOR_PROVIDERS: Provider[] = [
  authenticatedActorDataverseClientProviderDefinition,
  authenticatedActorGatewayProviderDefinition,
  authenticatedActorResolverProviderDefinition,
];
