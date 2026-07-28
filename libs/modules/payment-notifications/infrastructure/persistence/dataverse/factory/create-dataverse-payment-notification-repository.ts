import type { PaymentNotificationRepository } from '../../../../domain/repositories';
import {
  createPaymentNotificationMapper,
  toDomain,
  toPersistence,
  type IdGenerator,
  type PaymentNotificationMapper,
} from '../../mappers';
import { DataversePaymentNotificationRepository } from '../dataverse-payment-notification.repository';
import {
  DataverseWebApiPaymentNotificationGateway,
  FetchDataverseClient,
  type DataversePaymentNotificationSchema,
} from '../web-api';

const defaultMapper: PaymentNotificationMapper = Object.freeze({
  toPersistence,
  toDomain,
});

export interface CreateDataversePaymentNotificationRepositoryDependencies {
  readonly baseUrl: string;
  readonly getAccessToken: () => Promise<string>;
  readonly schema: DataversePaymentNotificationSchema;
  readonly fetchFn?: typeof fetch;
  readonly idGenerator?: IdGenerator;
}

export function createDataversePaymentNotificationRepository(
  dependencies: CreateDataversePaymentNotificationRepositoryDependencies,
): PaymentNotificationRepository {
  if (
    typeof dependencies.baseUrl !== 'string' ||
    dependencies.baseUrl.trim().length === 0
  ) {
    throw new Error('Dataverse baseUrl is required');
  }

  if (typeof dependencies.getAccessToken !== 'function') {
    throw new Error('Dataverse getAccessToken is required');
  }

  if (typeof dependencies.schema !== 'object' || dependencies.schema === null) {
    throw new Error('Dataverse payment notification schema is required');
  }

  const client = new FetchDataverseClient({
    baseUrl: dependencies.baseUrl,
    getAccessToken: dependencies.getAccessToken,
    fetchFn: dependencies.fetchFn,
  });
  const gateway = new DataverseWebApiPaymentNotificationGateway({
    client,
    schema: dependencies.schema,
  });
  const mapper = dependencies.idGenerator
    ? createPaymentNotificationMapper({
        idGenerator: dependencies.idGenerator,
      })
    : defaultMapper;

  return new DataversePaymentNotificationRepository({
    gateway,
    mapper,
  });
}
