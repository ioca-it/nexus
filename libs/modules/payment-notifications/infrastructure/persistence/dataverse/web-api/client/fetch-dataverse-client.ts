import type { DataverseClient, DataverseOperation } from '../dataverse-client';
import {
  DataverseHttpError,
  type FetchDataverseClientDependencies,
} from './dataverse-http.types';

type PhysicalRecord = Readonly<Record<string, unknown>>;

interface DataverseQueryPage {
  readonly value: readonly PhysicalRecord[];
  readonly '@odata.nextLink'?: string;
}

const JSON_CONTENT_TYPE = 'application/json';
const BATCH_BOUNDARY = 'batch_payment_notifications';
const CHANGESET_BOUNDARY = 'changeset_payment_notifications';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

function serializeFilterValue(field: string, value: unknown): string {
  if (typeof value === 'string') {
    return `${field} eq '${escapeODataString(value)}'`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${field} eq ${value}`;
  }

  if (typeof value === 'boolean') {
    return `${field} eq ${value}`;
  }

  if (
    Array.isArray(value) &&
    value.every((item): item is string => typeof item === 'string')
  ) {
    if (value.length === 0) {
      return 'false';
    }

    return `(${value
      .map((item) => `${field} eq '${escapeODataString(item)}'`)
      .join(' or ')})`;
  }

  throw new Error(`Unsupported Dataverse filter value for field "${field}"`);
}

function serializeFilter(filter: PhysicalRecord): string {
  return Object.entries(filter)
    .map(([field, value]) => serializeFilterValue(field, value))
    .join(' and ');
}

function stableFilterKey(entitySet: string, filter: PhysicalRecord): string {
  const entries = Object.entries(filter).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return `${entitySet}:${JSON.stringify(entries)}`;
}

function freezeRecord(record: PhysicalRecord): PhysicalRecord {
  return Object.freeze({ ...record });
}

function isQueryPage(value: unknown): value is DataverseQueryPage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    Array.isArray(value.value) &&
    value.value.every((record) => typeof record === 'object' && record !== null)
  );
}

export class FetchDataverseClient implements DataverseClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => Promise<string>;
  private readonly fetchFn: typeof fetch;

  constructor(dependencies: FetchDataverseClientDependencies) {
    this.baseUrl = normalizeBaseUrl(dependencies.baseUrl);
    this.getAccessToken = dependencies.getAccessToken;
    this.fetchFn = dependencies.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  async create(entitySet: string, record: PhysicalRecord): Promise<void> {
    const token = await this.getAccessToken();
    const response = await this.fetchFn(this.entitySetUrl(entitySet), {
      method: 'POST',
      headers: this.headers(token),
      body: JSON.stringify(record),
    });

    await this.requireSuccess(response);
  }

  async update(
    entitySet: string,
    id: string,
    record: PhysicalRecord,
  ): Promise<void> {
    const token = await this.getAccessToken();
    const response = await this.fetchFn(this.entityUrl(entitySet, id), {
      method: 'PATCH',
      headers: this.headers(token),
      body: JSON.stringify(record),
    });

    await this.requireSuccess(response);
  }

  async deleteWhere(entitySet: string, filter: PhysicalRecord): Promise<void> {
    const token = await this.getAccessToken();
    const records = await this.queryWithToken(entitySet, filter, token);

    for (const record of records) {
      const id = this.resolveRecordId(record);
      const response = await this.fetchFn(this.entityUrl(entitySet, id), {
        method: 'DELETE',
        headers: this.headers(token),
      });

      await this.requireSuccess(response);
    }
  }

  async findOne(entitySet: string, id: string): Promise<PhysicalRecord | null> {
    const token = await this.getAccessToken();
    const response = await this.fetchFn(this.entityUrl(entitySet, id), {
      method: 'GET',
      headers: this.headers(token),
    });

    if (response.status === 404) {
      return null;
    }

    await this.requireSuccess(response);

    return freezeRecord((await response.json()) as Record<string, unknown>);
  }

  async query(
    entitySet: string,
    filter: PhysicalRecord,
  ): Promise<readonly PhysicalRecord[]> {
    const token = await this.getAccessToken();

    return this.queryWithToken(entitySet, filter, token);
  }

  async executeAtomic(
    operations: readonly DataverseOperation[],
  ): Promise<void> {
    // Opti ChatGPT: reutilización del token y resolución previa para reducir llamadas HTTP.
    const token = await this.getAccessToken();
    const resolvedOperations = await this.resolveAtomicOperations(
      operations,
      token,
    );
    const body = this.buildBatchBody(resolvedOperations);
    const response = await this.fetchFn(`${this.baseUrl}/$batch`, {
      method: 'POST',
      headers: this.headers(
        token,
        `multipart/mixed; boundary=${BATCH_BOUNDARY}`,
      ),
      body,
    });
    const responseBody = await response.text();

    if (!response.ok) {
      throw new DataverseHttpError(response.status, responseBody || undefined);
    }

    const failedStatus = this.findFailedBatchStatus(responseBody);

    if (failedStatus !== undefined) {
      throw new DataverseHttpError(failedStatus, responseBody || undefined);
    }
  }

  private async resolveAtomicOperations(
    operations: readonly DataverseOperation[],
    token: string,
  ): Promise<readonly DataverseOperation[]> {
    const resolved: DataverseOperation[] = [];
    const resolvedDeletes = new Map<string, readonly PhysicalRecord[]>();

    for (const operation of operations) {
      if (operation.type !== 'deleteWhere') {
        resolved.push(operation);
        continue;
      }

      const cacheKey = stableFilterKey(operation.entitySet, operation.filter);
      let records = resolvedDeletes.get(cacheKey);

      if (!records) {
        records = await this.queryWithToken(
          operation.entitySet,
          operation.filter,
          token,
        );
        resolvedDeletes.set(cacheKey, records);
      }

      for (const record of records) {
        resolved.push(
          Object.freeze({
            type: 'deleteWhere',
            entitySet: operation.entitySet,
            filter: Object.freeze({
              id: this.resolveRecordId(record),
            }),
          }),
        );
      }
    }

    return Object.freeze(resolved);
  }

  private async queryWithToken(
    entitySet: string,
    filter: PhysicalRecord,
    token: string,
  ): Promise<readonly PhysicalRecord[]> {
    const records: PhysicalRecord[] = [];
    let nextUrl: string | undefined = this.queryUrl(entitySet, filter);

    while (nextUrl) {
      const response = await this.fetchFn(nextUrl, {
        method: 'GET',
        headers: this.headers(token),
      });
      await this.requireSuccess(response);
      const page: unknown = await response.json();

      if (!isQueryPage(page)) {
        throw new Error('Invalid Dataverse query response');
      }

      for (const record of page.value) {
        records.push(freezeRecord(record));
      }

      nextUrl = page['@odata.nextLink']
        ? new URL(page['@odata.nextLink'], `${this.baseUrl}/`).toString()
        : undefined;
    }

    return Object.freeze(records);
  }

  private buildBatchBody(operations: readonly DataverseOperation[]): string {
    const lines: string[] = [
      `--${BATCH_BOUNDARY}`,
      `Content-Type: multipart/mixed; boundary=${CHANGESET_BOUNDARY}`,
      '',
    ];
    let contentId = 1;

    for (const operation of operations) {
      lines.push(
        `--${CHANGESET_BOUNDARY}`,
        'Content-Type: application/http',
        'Content-Transfer-Encoding: binary',
        `Content-ID: ${contentId}`,
        '',
      );

      if (operation.type === 'create') {
        lines.push(
          `POST ${this.entitySetUrl(operation.entitySet)} HTTP/1.1`,
          `Content-Type: ${JSON_CONTENT_TYPE}`,
          '',
          JSON.stringify(operation.record),
        );
      } else if (operation.type === 'update') {
        lines.push(
          `PATCH ${this.entityUrl(operation.entitySet, operation.id)} HTTP/1.1`,
          `Content-Type: ${JSON_CONTENT_TYPE}`,
          '',
          JSON.stringify(operation.record),
        );
      } else {
        const id = operation.filter['id'];

        if (typeof id !== 'string') {
          throw new Error(
            'Resolved Dataverse delete operation is missing an id',
          );
        }

        lines.push(
          `DELETE ${this.entityUrl(operation.entitySet, id)} HTTP/1.1`,
          '',
        );
      }

      contentId += 1;
    }

    lines.push(`--${CHANGESET_BOUNDARY}--`, `--${BATCH_BOUNDARY}--`, '');

    return lines.join('\r\n');
  }

  private findFailedBatchStatus(responseBody: string): number | undefined {
    const statusPattern = /HTTP\/1\.[01]\s+(\d{3})/g;

    for (const match of responseBody.matchAll(statusPattern)) {
      const status = Number(match[1]);

      if (status >= 400) {
        return status;
      }
    }

    return undefined;
  }

  private resolveRecordId(record: PhysicalRecord): string {
    const directId = record['id'];

    if (typeof directId === 'string' && directId.length > 0) {
      return directId;
    }

    const odataId = record['@odata.id'];

    if (typeof odataId === 'string') {
      const match = /\(([^)]+)\)\/?$/.exec(odataId);

      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    }

    throw new Error(
      'Dataverse record cannot be deleted because its id is missing',
    );
  }

  private queryUrl(entitySet: string, filter: PhysicalRecord): string {
    const url = new URL(this.entitySetUrl(entitySet));
    const expression = serializeFilter(filter);

    if (expression.length > 0) {
      url.searchParams.set('$filter', expression);
    }

    return url.toString();
  }

  private entitySetUrl(entitySet: string): string {
    return `${this.baseUrl}/${encodePathValue(entitySet)}`;
  }

  private entityUrl(entitySet: string, id: string): string {
    return `${this.entitySetUrl(entitySet)}(${encodePathValue(id)})`;
  }

  private headers(
    token: string,
    contentType = JSON_CONTENT_TYPE,
  ): Readonly<Record<string, string>> {
    return Object.freeze({
      Authorization: `Bearer ${token}`,
      Accept: JSON_CONTENT_TYPE,
      'Content-Type': contentType,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    });
  }

  private async requireSuccess(response: Response): Promise<void> {
    if (response.ok) {
      return;
    }

    const responseBody = await response.text();

    throw new DataverseHttpError(response.status, responseBody || undefined);
  }
}
