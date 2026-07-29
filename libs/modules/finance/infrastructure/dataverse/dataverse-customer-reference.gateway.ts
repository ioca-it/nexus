import { createNexusCustomerId, type NexusCustomerId } from '../../domain';
import type {
  FinanceCustomerReferenceGateway,
  FinanceCustomerReferenceRecord,
} from './customer-reference.gateway';

type PhysicalRecord = Readonly<Record<string, unknown>>;

export interface DataverseFinanceQueryClient {
  query(
    entitySet: string,
    filter: PhysicalRecord,
  ): Promise<readonly PhysicalRecord[]>;
}

export interface DataverseFinanceCustomerReferenceSchema {
  readonly customerEntitySet: string;
  readonly customerFields: {
    readonly nexusCustomerId: string;
    readonly businessCentralCustomerId: string;
    readonly active: string;
  };
}

export interface DataverseFinanceCustomerReferenceGatewayDependencies {
  readonly client: DataverseFinanceQueryClient;
  readonly schema: DataverseFinanceCustomerReferenceSchema;
}

function invalidRecord(fieldName: string): never {
  throw new Error(
    `Invalid Dataverse Finance customer reference record: missing or invalid field "${fieldName}"`,
  );
}

function readRequiredString(record: PhysicalRecord, fieldName: string): string {
  const value = readString(record, fieldName);

  if (value.trim().length === 0) {
    return invalidRecord(fieldName);
  }

  return value.trim();
}

function readString(record: PhysicalRecord, fieldName: string): string {
  const value = record[fieldName];

  if (typeof value !== 'string') {
    return invalidRecord(fieldName);
  }

  return value;
}

function readBoolean(record: PhysicalRecord, fieldName: string): boolean {
  const value = record[fieldName];

  if (typeof value !== 'boolean') {
    return invalidRecord(fieldName);
  }

  return value;
}

export class DataverseFinanceCustomerReferenceGateway
  implements FinanceCustomerReferenceGateway
{
  private readonly client: DataverseFinanceQueryClient;
  private readonly schema: DataverseFinanceCustomerReferenceSchema;

  constructor(
    dependencies: DataverseFinanceCustomerReferenceGatewayDependencies,
  ) {
    this.client = dependencies.client;
    this.schema = dependencies.schema;
  }

  async findByNexusCustomerId(
    customerId: NexusCustomerId,
  ): Promise<FinanceCustomerReferenceRecord | null> {
    const normalizedCustomerId = createNexusCustomerId(customerId);
    const fields = this.schema.customerFields;
    const records = await this.client.query(
      this.schema.customerEntitySet,
      Object.freeze({
        [fields.nexusCustomerId]: normalizedCustomerId,
      }),
    );

    if (records.length === 0) {
      return null;
    }

    if (records.length > 1) {
      throw new Error(
        'Dataverse returned multiple Finance customer references for the same NEXUS customer',
      );
    }

    const record = records[0];
    const physicalNexusCustomerId = readRequiredString(
      record,
      fields.nexusCustomerId,
    );
    const physicalBusinessCentralCustomerId = readString(
      record,
      fields.businessCentralCustomerId,
    );
    const active = readBoolean(record, fields.active);

    if (!active) {
      return null;
    }

    return Object.freeze({
      nexusCustomerId: physicalNexusCustomerId,
      businessCentralCustomerId:
        physicalBusinessCentralCustomerId.trim().length === 0
          ? invalidRecord(fields.businessCentralCustomerId)
          : physicalBusinessCentralCustomerId.trim(),
      active,
    });
  }
}
