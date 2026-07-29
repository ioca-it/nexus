import type { BusinessCentralHttpClient } from '../../http';
import {
  optionalString,
  requireBusinessCentralRecord,
  requireFiniteNumber,
  requireIsoDate,
  requireString,
} from '../common';
import type {
  BusinessCentralCreditMemo,
  BusinessCentralCreditMemoGateway,
} from './business-central-credit-memo.types';

const RESOURCE_PATH = 'salesCreditMemos';
const RESOURCE_NAME = 'sales credit memo';
const SELECT = Object.freeze([
  'id',
  'number',
  'customerId',
  'customerNumber',
  'creditMemoDate',
  'currencyCode',
  'totalAmountIncludingTax',
  'status',
] as const);

function requireLookupId(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function mapCreditMemo(value: unknown): BusinessCentralCreditMemo {
  const record = requireBusinessCentralRecord(value, RESOURCE_NAME);

  return Object.freeze({
    id: requireString(record, 'id', RESOURCE_NAME),
    number: requireString(record, 'number', RESOURCE_NAME),
    customerId: requireString(record, 'customerId', RESOURCE_NAME),
    customerNumber: optionalString(record, 'customerNumber', RESOURCE_NAME),
    creditMemoDate: requireIsoDate(record, 'creditMemoDate', RESOURCE_NAME),
    currencyCode: optionalString(record, 'currencyCode', RESOURCE_NAME),
    totalAmount: requireFiniteNumber(
      record,
      'totalAmountIncludingTax',
      RESOURCE_NAME,
    ),
    status: optionalString(record, 'status', RESOURCE_NAME),
  });
}

export class StandardApiBusinessCentralCreditMemoGateway
  implements BusinessCentralCreditMemoGateway
{
  constructor(private readonly client: BusinessCentralHttpClient) {}

  async findById(id: string): Promise<BusinessCentralCreditMemo | null> {
    const normalizedId = requireLookupId(id, 'id');
    const record = await this.client.getOne<unknown>(
      `${RESOURCE_PATH}(${encodeURIComponent(normalizedId)})?$select=${SELECT.join(
        ',',
      )}`,
    );

    return record === null ? null : mapCreditMemo(record);
  }

  async findByCustomer(
    customerId: string,
  ): Promise<readonly BusinessCentralCreditMemo[]> {
    const normalizedCustomerId = requireLookupId(customerId, 'customerId');
    const records = await this.client.query<unknown>(RESOURCE_PATH, {
      select: SELECT,
      filter: Object.freeze({ customerId: normalizedCustomerId }),
    });

    return Object.freeze(records.map(mapCreditMemo));
  }
}
