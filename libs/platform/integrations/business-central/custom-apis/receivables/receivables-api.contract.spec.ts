import { readFileSync } from 'node:fs';

import type {
  BusinessCentralReceivable,
  ReceivableApiRecord,
} from '../../../../index';
import {
  createReceivablesApiContract,
  RECEIVABLES_API_FIELDS,
  RECEIVABLES_API_REQUIRED_FILTERS,
  validateReceivableApiRecord,
} from './receivables-api.contract';

type RequiredKeys<T> = {
  [Key in keyof T]-?: object extends Pick<T, Key> ? never : Key;
}[keyof T];

type Assert<T extends true> = T;

const coversRequiredGatewayFields: Assert<
  Exclude<
    RequiredKeys<BusinessCentralReceivable>,
    keyof ReceivableApiRecord
  > extends never
    ? true
    : false
> = true;

const metadata = Object.freeze({
  publisher: 'testPublisher',
  group: 'testGroup',
  version: 'v1.0',
  entityName: 'testReceivable',
  entitySetName: 'testReceivables',
});

function validRecord(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    id: 'entry-id',
    customerId: 'customer-id',
    documentType: 'Invoice',
    documentNumber: 'INV-100',
    postingDate: '2026-07-01',
    dueDate: '2026-08-01',
    originalAmount: 100,
    remainingAmount: 25,
    currencyCode: 'USD',
    open: true,
    lastModifiedDateTime: '2026-07-02T12:30:00.000Z',
  });
}

describe('Receivables custom API contract', () => {
  it('defines exact fields, required filters, and read-only metadata', () => {
    const contract = createReceivablesApiContract(metadata);

    expect(contract.fields).toEqual([
      'id',
      'customerId',
      'documentType',
      'documentNumber',
      'postingDate',
      'dueDate',
      'originalAmount',
      'remainingAmount',
      'currencyCode',
      'open',
      'lastModifiedDateTime',
    ]);
    expect(contract.fields).toBe(RECEIVABLES_API_FIELDS);
    expect(contract.requiredFilters).toEqual(['customerId', 'open']);
    expect(contract.requiredFilters).toBe(RECEIVABLES_API_REQUIRED_FILTERS);
    expect(contract.readOnly).toBe(true);
    expect(contract.metadata).toEqual(metadata);
    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.metadata)).toBe(true);
    expect(Object.isFrozen(contract.fields)).toBe(true);
    expect(Object.isFrozen(contract.requiredFilters)).toBe(true);
  });

  it('does not fix production routing metadata or expose Payment Notifications', () => {
    const source = readFileSync(__filename.replace('.spec.ts', '.ts'), 'utf8');

    expect(source).not.toMatch(
      /tenantId|environmentName|companyId|objectId|https?:\/\//,
    );
    expect(source).not.toMatch(/PaymentNotification|payment-notification/i);
    expect(source).not.toMatch(
      /publisher:\s*['"]|group:\s*['"]|version:\s*['"]|entityName:\s*['"]|entitySetName:\s*['"]/,
    );
  });

  it('validates and freezes a complete record without modifying its input', () => {
    const record = validRecord();
    const before = JSON.stringify(record);

    const result = validateReceivableApiRecord(record);

    expect(result).toEqual(record);
    expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(record)).toBe(before);
  });

  it.each([
    ['id', ''],
    ['id', '   '],
    ['customerId', ''],
    ['customerId', '   '],
  ])('rejects an empty required identifier in %s', (fieldName, value) => {
    expect(() =>
      validateReceivableApiRecord({
        ...validRecord(),
        [fieldName]: value,
      }),
    ).toThrow(fieldName);
  });

  it.each([
    ['postingDate', '2026-02-30'],
    ['dueDate', 'not-a-date'],
    ['lastModifiedDateTime', '2026-07-01T25:00:00Z'],
  ])('rejects an invalid ISO date in %s', (fieldName, value) => {
    expect(() =>
      validateReceivableApiRecord({
        ...validRecord(),
        [fieldName]: value,
      }),
    ).toThrow(fieldName);
  });

  it.each([
    ['originalAmount', Number.NaN],
    ['originalAmount', Number.POSITIVE_INFINITY],
    ['remainingAmount', Number.NEGATIVE_INFINITY],
  ])('rejects a non-finite amount in %s', (fieldName, value) => {
    expect(() =>
      validateReceivableApiRecord({
        ...validRecord(),
        [fieldName]: value,
      }),
    ).toThrow(fieldName);
  });

  it('rejects a non-boolean open value', () => {
    expect(() =>
      validateReceivableApiRecord({
        ...validRecord(),
        open: 'true',
      }),
    ).toThrow('open');
  });

  it('preserves present optional fields and omits absent ones', () => {
    const complete = validateReceivableApiRecord(validRecord());
    const minimal = validateReceivableApiRecord({
      id: 'entry-id',
      customerId: 'customer-id',
      documentType: 'Invoice',
      documentNumber: 'INV-100',
      postingDate: '2026-07-01',
      originalAmount: 100,
      remainingAmount: 25,
      open: true,
    });

    expect(complete).toHaveProperty('dueDate', '2026-08-01');
    expect(complete).toHaveProperty('currencyCode', 'USD');
    expect(complete).toHaveProperty(
      'lastModifiedDateTime',
      '2026-07-02T12:30:00.000Z',
    );
    expect(minimal).not.toHaveProperty('dueDate');
    expect(minimal).not.toHaveProperty('currencyCode');
    expect(minimal).not.toHaveProperty('lastModifiedDateTime');
  });

  it('covers every required receivable gateway field without inference', () => {
    expect(coversRequiredGatewayFields).toBe(true);
    expect(RECEIVABLES_API_FIELDS).toEqual(
      expect.arrayContaining([
        'id',
        'customerId',
        'documentType',
        'documentNumber',
        'postingDate',
        'originalAmount',
        'remainingAmount',
        'open',
      ]),
    );
  });
});
