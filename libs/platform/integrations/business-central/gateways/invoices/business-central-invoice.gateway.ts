import type { BusinessCentralHttpClient } from '../../http';
import {
  optionalFiniteNumber,
  optionalIsoDate,
  optionalString,
  requireBusinessCentralRecord,
  requireFiniteNumber,
  requireIsoDate,
  requireString,
} from '../common';
import type {
  BusinessCentralInvoice,
  BusinessCentralInvoiceGateway,
} from './business-central-invoice.types';

const RESOURCE_PATH = 'salesInvoices';
const RESOURCE_NAME = 'sales invoice';
const SELECT = Object.freeze([
  'id',
  'number',
  'customerId',
  'customerNumber',
  'invoiceDate',
  'dueDate',
  'currencyCode',
  'totalAmountIncludingTax',
  'remainingAmount',
  'status',
] as const);

function requireLookupId(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function selectQuery(): string {
  return `$select=${SELECT.join(',')}`;
}

function mapInvoice(value: unknown): BusinessCentralInvoice {
  const record = requireBusinessCentralRecord(value, RESOURCE_NAME);

  return Object.freeze({
    id: requireString(record, 'id', RESOURCE_NAME),
    number: requireString(record, 'number', RESOURCE_NAME),
    customerId: requireString(record, 'customerId', RESOURCE_NAME),
    customerNumber: optionalString(record, 'customerNumber', RESOURCE_NAME),
    invoiceDate: requireIsoDate(record, 'invoiceDate', RESOURCE_NAME),
    dueDate: optionalIsoDate(record, 'dueDate', RESOURCE_NAME),
    currencyCode: optionalString(record, 'currencyCode', RESOURCE_NAME),
    totalAmount: requireFiniteNumber(
      record,
      'totalAmountIncludingTax',
      RESOURCE_NAME,
    ),
    remainingAmount: optionalFiniteNumber(
      record,
      'remainingAmount',
      RESOURCE_NAME,
    ),
    status: optionalString(record, 'status', RESOURCE_NAME),
  });
}

export class StandardApiBusinessCentralInvoiceGateway
  implements BusinessCentralInvoiceGateway
{
  constructor(private readonly client: BusinessCentralHttpClient) {}

  async findById(id: string): Promise<BusinessCentralInvoice | null> {
    const normalizedId = requireLookupId(id, 'id');
    const record = await this.client.getOne<unknown>(
      `${RESOURCE_PATH}(${encodeURIComponent(normalizedId)})?${selectQuery()}`,
    );

    return record === null ? null : mapInvoice(record);
  }

  async findByCustomer(
    customerId: string,
  ): Promise<readonly BusinessCentralInvoice[]> {
    const normalizedCustomerId = requireLookupId(customerId, 'customerId');
    const records = await this.client.query<unknown>(RESOURCE_PATH, {
      select: SELECT,
      filter: Object.freeze({ customerId: normalizedCustomerId }),
    });

    return Object.freeze(records.map(mapInvoice));
  }
}
