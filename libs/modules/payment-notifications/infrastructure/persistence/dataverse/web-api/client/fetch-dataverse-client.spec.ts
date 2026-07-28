import type { DataverseOperation } from '../dataverse-client';
import {
  DataverseHttpError,
  type FetchDataverseClientDependencies,
} from './dataverse-http.types';
import { FetchDataverseClient } from './fetch-dataverse-client';

const BASE_URL = 'https://example.crm.dynamics.com/api/data/v9.2';
const ACCESS_TOKEN = 'access-token-value';

function createResponse(
  status: number,
  body?: string,
  headers?: HeadersInit,
): Response {
  return new Response(body, { status, headers });
}

function createJsonResponse(status: number, body: unknown): Response {
  return createResponse(status, JSON.stringify(body), {
    'Content-Type': 'application/json',
  });
}

function createDependencies(
  overrides: Partial<FetchDataverseClientDependencies> = {},
): {
  readonly dependencies: FetchDataverseClientDependencies;
  readonly fetchFn: jest.MockedFunction<typeof fetch>;
  readonly getAccessToken: jest.MockedFunction<() => Promise<string>>;
} {
  const fetchFn = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  const getAccessToken = jest.fn<Promise<string>, []>();
  getAccessToken.mockResolvedValue(ACCESS_TOKEN);

  return {
    dependencies: {
      baseUrl: `${BASE_URL}///`,
      getAccessToken,
      fetchFn,
      ...overrides,
    },
    fetchFn,
    getAccessToken,
  };
}

function expectDataverseHeaders(
  request: RequestInit | undefined,
  contentType = 'application/json',
): void {
  expect(request?.headers).toEqual({
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    Accept: 'application/json',
    'Content-Type': contentType,
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
  });
}

function successfulBatchResponse(): Response {
  return createResponse(
    200,
    [
      '--batchresponse',
      'Content-Type: multipart/mixed',
      '',
      'HTTP/1.1 204 No Content',
      '--batchresponse--',
    ].join('\r\n'),
  );
}

describe('FetchDataverseClient', () => {
  it('normalizes baseUrl once and create uses POST with Dataverse headers', async () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    fetchFn.mockResolvedValue(createResponse(204));
    const client = new FetchDataverseClient(dependencies);
    const record = Object.freeze({ name: 'notification' });

    await client.create('notifications', record);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      `${BASE_URL}/notifications`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(record),
      }),
    );
    expectDataverseHeaders(fetchFn.mock.calls[0][1]);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('update uses PATCH and escapes the identifier', async () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    fetchFn.mockResolvedValue(createResponse(204));
    const client = new FetchDataverseClient(dependencies);
    const record = Object.freeze({ status: 'SUBMITTED' });

    await client.update('notifications', "id/with space'", record);

    expect(fetchFn).toHaveBeenCalledWith(
      `${BASE_URL}/notifications(id%2Fwith%20space%27)`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(record),
      }),
    );
    expectDataverseHeaders(fetchFn.mock.calls[0][1]);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('findOne returns a readonly physical record', async () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    fetchFn.mockResolvedValue(
      createJsonResponse(200, {
        id: 'payment-notification-1',
        status: 'DRAFT',
      }),
    );
    const client = new FetchDataverseClient(dependencies);

    const result = await client.findOne(
      'notifications',
      'payment-notification-1',
    );

    expect(result).toEqual({
      id: 'payment-notification-1',
      status: 'DRAFT',
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('GET');
    expectDataverseHeaders(fetchFn.mock.calls[0][1]);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('findOne returns null for HTTP 404', async () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    fetchFn.mockResolvedValue(createResponse(404, 'Not found'));
    const client = new FetchDataverseClient(dependencies);

    const result = await client.findOne(
      'notifications',
      'missing-notification',
    );

    expect(result).toBeNull();
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ status: 'UNDER_REVIEW' }, "status eq 'UNDER_REVIEW'"],
    [{ amount: 125.5 }, 'amount eq 125.5'],
    [{ active: true }, 'active eq true'],
  ] as const)(
    'query serializes scalar filter %p',
    async (filter, expectedExpression) => {
      const { dependencies, fetchFn, getAccessToken } = createDependencies();
      fetchFn.mockResolvedValue(createJsonResponse(200, { value: [] }));
      const client = new FetchDataverseClient(dependencies);

      await client.query('notifications', filter);

      const requestUrl = new URL(fetchFn.mock.calls[0][0].toString());
      expect(requestUrl.searchParams.get('$filter')).toBe(expectedExpression);
      expect(getAccessToken).toHaveBeenCalledTimes(1);
    },
  );

  it('query escapes single quotes in string values', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(createJsonResponse(200, { value: [] }));
    const client = new FetchDataverseClient(dependencies);

    await client.query('notifications', {
      bankReference: "BANK'O'HARE",
    });

    const requestUrl = new URL(fetchFn.mock.calls[0][0].toString());
    expect(requestUrl.searchParams.get('$filter')).toBe(
      "bankReference eq 'BANK''O''HARE'",
    );
  });

  it('query groups string arrays as OR conditions', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(createJsonResponse(200, { value: [] }));
    const client = new FetchDataverseClient(dependencies);

    await client.query('invoices', {
      paymentNotificationId: Object.freeze([
        'notification-1',
        'notification-2',
      ]),
    });

    const requestUrl = new URL(fetchFn.mock.calls[0][0].toString());
    expect(requestUrl.searchParams.get('$filter')).toBe(
      "(paymentNotificationId eq 'notification-1' or paymentNotificationId eq 'notification-2')",
    );
  });

  it('query follows @odata.nextLink using one token', async () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    const nextLink = `${BASE_URL}/notifications?$skiptoken=page-2`;
    fetchFn
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          value: [{ id: 'notification-1' }],
          '@odata.nextLink': nextLink,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          value: [{ id: 'notification-2' }],
        }),
      );
    const client = new FetchDataverseClient(dependencies);

    const result = await client.query('notifications', {
      customerId: 'customer-1',
    });

    expect(result).toEqual([
      { id: 'notification-1' },
      { id: 'notification-2' },
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1][0]).toBe(nextLink);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('deleteWhere queries matches and deletes each record with one token', async () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    fetchFn
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          value: [
            { id: 'relation-1' },
            {
              '@odata.id': `${BASE_URL}/invoice_relations(relation-2)`,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(createResponse(204))
      .mockResolvedValueOnce(createResponse(204));
    const client = new FetchDataverseClient(dependencies);

    await client.deleteWhere('invoice_relations', {
      paymentNotificationId: 'notification-1',
    });

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('GET');
    expect(fetchFn.mock.calls[1]).toEqual([
      `${BASE_URL}/invoice_relations(relation-1)`,
      expect.objectContaining({ method: 'DELETE' }),
    ]);
    expect(fetchFn.mock.calls[2]).toEqual([
      `${BASE_URL}/invoice_relations(relation-2)`,
      expect.objectContaining({ method: 'DELETE' }),
    ]);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('executeAtomic sends create and update in one changeset and one request', async () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    fetchFn.mockResolvedValue(successfulBatchResponse());
    const client = new FetchDataverseClient(dependencies);
    const operations: readonly DataverseOperation[] = Object.freeze([
      Object.freeze({
        type: 'create',
        entitySet: 'notifications',
        record: Object.freeze({ id: 'notification-1' }),
      }),
      Object.freeze({
        type: 'update',
        entitySet: 'notifications',
        id: 'notification-2',
        record: Object.freeze({ status: 'SUBMITTED' }),
      }),
    ]);

    await client.executeAtomic(operations);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE_URL}/$batch`);
    const request = fetchFn.mock.calls[0][1];
    expect(request?.method).toBe('POST');
    expectDataverseHeaders(
      request,
      'multipart/mixed; boundary=batch_payment_notifications',
    );
    expect(request?.body).toEqual(expect.any(String));
    const body = request?.body as string;
    expect(body).toContain(`POST ${BASE_URL}/notifications HTTP/1.1`);
    expect(body).toContain(
      `PATCH ${BASE_URL}/notifications(notification-2) HTTP/1.1`,
    );
    expect(
      body.match(
        /Content-Type: multipart\/mixed; boundary=changeset_payment_notifications/g,
      ),
    ).toHaveLength(1);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('executeAtomic resolves deleteWhere before one final batch write', async () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    fetchFn
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          value: [{ id: 'relation-1' }, { id: 'relation-2' }],
        }),
      )
      .mockResolvedValueOnce(successfulBatchResponse());
    const client = new FetchDataverseClient(dependencies);
    const operations: readonly DataverseOperation[] = Object.freeze([
      Object.freeze({
        type: 'deleteWhere',
        entitySet: 'invoice_relations',
        filter: Object.freeze({
          paymentNotificationId: 'notification-1',
        }),
      }),
    ]);

    await client.executeAtomic(operations);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[0][1]?.method).toBe('GET');
    expect(fetchFn.mock.calls[1][0]).toBe(`${BASE_URL}/$batch`);
    expect(fetchFn.mock.calls[1][1]?.method).toBe('POST');
    const batchBody = fetchFn.mock.calls[1][1]?.body as string;
    expect(batchBody).toContain(
      `DELETE ${BASE_URL}/invoice_relations(relation-1) HTTP/1.1`,
    );
    expect(batchBody).toContain(
      `DELETE ${BASE_URL}/invoice_relations(relation-2) HTTP/1.1`,
    );
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('executeAtomic resolves a repeated delete filter only once', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          value: [{ id: 'relation-1' }],
        }),
      )
      .mockResolvedValueOnce(successfulBatchResponse());
    const client = new FetchDataverseClient(dependencies);
    const deleteOperation: DataverseOperation = Object.freeze({
      type: 'deleteWhere',
      entitySet: 'invoice_relations',
      filter: Object.freeze({
        paymentNotificationId: 'notification-1',
      }),
    });

    await client.executeAtomic(
      Object.freeze([deleteOperation, deleteOperation]),
    );

    expect(
      fetchFn.mock.calls.filter(([, request]) => request?.method === 'GET'),
    ).toHaveLength(1);
    expect(
      fetchFn.mock.calls.filter(([, request]) => request?.method === 'POST'),
    ).toHaveLength(1);
  });

  it('executeAtomic detects an internal changeset failure', async () => {
    const { dependencies, fetchFn } = createDependencies();
    const responseBody = [
      '--batchresponse',
      'HTTP/1.1 400 Bad Request',
      '',
      '{"error":{"message":"Invalid record"}}',
      '--batchresponse--',
    ].join('\r\n');
    fetchFn.mockResolvedValue(createResponse(200, responseBody));
    const client = new FetchDataverseClient(dependencies);

    const execution = client.executeAtomic([
      {
        type: 'create',
        entitySet: 'notifications',
        record: { id: 'notification-1' },
      },
    ]);

    await expect(execution).rejects.toMatchObject({
      name: 'DataverseHttpError',
      status: 400,
      responseBody,
    });
  });

  it.each([
    [
      'create',
      async (client: FetchDataverseClient) =>
        client.create('notifications', { id: 'notification-1' }),
    ],
    [
      'update',
      async (client: FetchDataverseClient) =>
        client.update('notifications', 'notification-1', {
          status: 'SUBMITTED',
        }),
    ],
    [
      'query',
      async (client: FetchDataverseClient) =>
        client.query('notifications', { customerId: 'customer-1' }),
    ],
  ] as const)(
    '%s surfaces HTTP failures as DataverseHttpError',
    async (_operation, execute) => {
      const { dependencies, fetchFn } = createDependencies();
      fetchFn.mockResolvedValue(createResponse(500, 'Dataverse unavailable'));
      const client = new FetchDataverseClient(dependencies);

      const execution = execute(client);

      await expect(execution).rejects.toBeInstanceOf(DataverseHttpError);
      await expect(execution).rejects.toMatchObject({
        status: 500,
        responseBody: 'Dataverse unavailable',
      });
    },
  );

  it('never includes the access token in HTTP error messages', async () => {
    const secretToken = 'highly-secret-access-token';
    const { dependencies, fetchFn } = createDependencies({
      getAccessToken: jest.fn().mockResolvedValue(secretToken),
    });
    fetchFn.mockResolvedValue(createResponse(401, 'Authentication failed'));
    const client = new FetchDataverseClient(dependencies);

    try {
      await client.create('notifications', {
        id: 'notification-1',
      });
      throw new Error('Expected create to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(DataverseHttpError);
      expect((error as Error).message).not.toContain(secretToken);
    }
  });

  it('does not modify records, filters, or atomic operations', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn
      .mockResolvedValueOnce(createResponse(204))
      .mockResolvedValueOnce(createJsonResponse(200, { value: [] }))
      .mockResolvedValueOnce(successfulBatchResponse());
    const client = new FetchDataverseClient(dependencies);
    const record = Object.freeze({ id: 'notification-1' });
    const filter = Object.freeze({ customerId: 'customer-1' });
    const operations: readonly DataverseOperation[] = Object.freeze([
      Object.freeze({
        type: 'create',
        entitySet: 'notifications',
        record,
      }),
    ]);

    await client.create('notifications', record);
    await client.query('notifications', filter);
    await client.executeAtomic(operations);

    expect(record).toEqual({ id: 'notification-1' });
    expect(filter).toEqual({ customerId: 'customer-1' });
    expect(operations).toEqual([
      {
        type: 'create',
        entitySet: 'notifications',
        record: { id: 'notification-1' },
      },
    ]);
  });
});
