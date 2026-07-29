import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  BusinessCentralHttpError as PublicBusinessCentralHttpError,
  FetchBusinessCentralClient as PublicFetchBusinessCentralClient,
  type BusinessCentralHttpClient as PublicBusinessCentralHttpClient,
} from '../../../index';
import { BusinessCentralHttpError } from './business-central-http.error';
import type {
  BusinessCentralQueryOptions,
  FetchBusinessCentralClientDependencies,
} from './business-central-http.types';
import { FetchBusinessCentralClient } from './fetch-business-central-client';

const COMPANY_BASE_URL =
  'https://api.example.test/v2.0/tenant/environment/api/v2.0/companies(company)';
const ACCESS_TOKEN = 'access-token-value';
const CLIENT_SOURCE = readFileSync(
  join(__dirname, 'fetch-business-central-client.ts'),
  'utf8',
);

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
  overrides: Partial<FetchBusinessCentralClientDependencies> = {},
): {
  readonly dependencies: FetchBusinessCentralClientDependencies;
  readonly fetchFn: jest.MockedFunction<typeof fetch>;
  readonly getAccessToken: jest.MockedFunction<() => Promise<string>>;
} {
  const fetchFn = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  const getAccessToken = jest.fn<Promise<string>, []>();
  getAccessToken.mockResolvedValue(ACCESS_TOKEN);

  return {
    dependencies: {
      companyBaseUrl: `  ${COMPANY_BASE_URL}///  `,
      getAccessToken,
      fetchFn,
      ...overrides,
    },
    fetchFn,
    getAccessToken,
  };
}

function requestUrl(
  fetchFn: jest.MockedFunction<typeof fetch>,
  callIndex = 0,
): URL {
  return new URL(String(fetchFn.mock.calls[callIndex][0]));
}

function expectBusinessCentralHeaders(request: RequestInit | undefined): void {
  expect(request?.headers).toEqual({
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
  });
}

describe('FetchBusinessCentralClient', () => {
  it('performs no I/O or token acquisition during construction', () => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();

    new FetchBusinessCentralClient(dependencies);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it('getOne performs GET against the normalized company base URL', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(
      createJsonResponse(200, { id: 'customer-1', name: 'Customer' }),
    );
    const client = new FetchBusinessCentralClient(dependencies);

    await client.getOne('customers(customer-1)');

    expect(fetchFn).toHaveBeenCalledWith(
      `${COMPANY_BASE_URL}/customers(customer-1)`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('getOne returns the response object', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(
      createJsonResponse(200, { id: 'customer-1', name: 'Customer' }),
    );
    const client = new FetchBusinessCentralClient(dependencies);

    await expect(client.getOne('customers(customer-1)')).resolves.toEqual({
      id: 'customer-1',
      name: 'Customer',
    });
  });

  it('getOne returns null only for HTTP 404', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(createResponse(404, 'not found'));
    const client = new FetchBusinessCentralClient(dependencies);

    await expect(client.getOne('customers(missing)')).resolves.toBeNull();
  });

  it('getOne throws BusinessCentralHttpError for other HTTP failures', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(createResponse(503, 'unavailable'));
    const client = new FetchBusinessCentralClient(dependencies);

    await expect(client.getOne('customers(customer-1)')).rejects.toMatchObject({
      status: 503,
      operation: 'getOne',
    });
  });

  it.each([null, [], 'invalid'])(
    'getOne rejects a non-object JSON response: %p',
    async (body) => {
      const { dependencies, fetchFn } = createDependencies();
      fetchFn.mockResolvedValue(createJsonResponse(200, body));
      const client = new FetchBusinessCentralClient(dependencies);

      await expect(client.getOne('customers(customer-1)')).rejects.toThrow(
        'Invalid Business Central getOne response',
      );
    },
  );

  it('query returns an ordered frozen collection', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(
      createJsonResponse(200, {
        value: [{ id: 'first' }, { id: 'second' }],
      }),
    );
    const client = new FetchBusinessCentralClient(dependencies);

    const result = await client.query('customers');

    expect(result).toEqual([{ id: 'first' }, { id: 'second' }]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('serializes a string filter and escapes single quotes', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(createJsonResponse(200, { value: [] }));
    const client = new FetchBusinessCentralClient(dependencies);

    await client.query('customers', {
      filter: Object.freeze({ displayName: "O'Brien" }),
    });

    expect(requestUrl(fetchFn).searchParams.get('$filter')).toBe(
      "displayName eq 'O''Brien'",
    );
  });

  it('serializes number and boolean filters', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(createJsonResponse(200, { value: [] }));
    const client = new FetchBusinessCentralClient(dependencies);

    await client.query('customers', {
      filter: Object.freeze({ balance: 10.5, blocked: false }),
    });

    expect(requestUrl(fetchFn).searchParams.get('$filter')).toBe(
      'balance eq 10.5 and blocked eq false',
    );
  });

  it('serializes string arrays as grouped OR conditions', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(createJsonResponse(200, { value: [] }));
    const client = new FetchBusinessCentralClient(dependencies);

    await client.query('customers', {
      filter: Object.freeze({
        countryCode: Object.freeze(['US', 'CA']),
      }),
    });

    expect(requestUrl(fetchFn).searchParams.get('$filter')).toBe(
      "(countryCode eq 'US' or countryCode eq 'CA')",
    );
  });

  it.each([
    ['select', ['id', 'displayName'], '$select', 'id,displayName'],
    ['expand', ['contacts', 'addresses'], '$expand', 'contacts,addresses'],
    [
      'orderBy',
      ['displayName asc', 'id desc'],
      '$orderby',
      'displayName asc,id desc',
    ],
  ] as const)(
    'serializes %s query options',
    async (optionName, values, parameterName, expected) => {
      const { dependencies, fetchFn } = createDependencies();
      fetchFn.mockResolvedValue(createJsonResponse(200, { value: [] }));
      const client = new FetchBusinessCentralClient(dependencies);

      await client.query('customers', {
        [optionName]: values,
      });

      expect(requestUrl(fetchFn).searchParams.get(parameterName)).toBe(
        expected,
      );
    },
  );

  it('serializes top', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(createJsonResponse(200, { value: [] }));
    const client = new FetchBusinessCentralClient(dependencies);

    await client.query('customers', { top: 25 });

    expect(requestUrl(fetchFn).searchParams.get('$top')).toBe('25');
  });

  it('follows the complete nextLink and reuses one token for every page', async () => {
    const nextLink = `${COMPANY_BASE_URL}/customers?$skiptoken=opaque`;
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    fetchFn
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          value: [{ id: 'first' }],
          '@odata.nextLink': nextLink,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, { value: [{ id: 'second' }] }),
      );
    const client = new FetchBusinessCentralClient(dependencies);

    await expect(client.query('customers')).resolves.toEqual([
      { id: 'first' },
      { id: 'second' },
    ]);
    expect(fetchFn.mock.calls[1][0]).toBe(nextLink);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('detects a repeated nextLink before fetching it again', async () => {
    const repeatedLink = `${COMPANY_BASE_URL}/customers`;
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(
      createJsonResponse(200, {
        value: [],
        '@odata.nextLink': repeatedLink,
      }),
    );
    const client = new FetchBusinessCentralClient(dependencies);

    await expect(client.query('customers')).rejects.toThrow(
      'Business Central pagination contains a repeated link',
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'another origin',
      'https://other.example.test/v2.0/tenant/environment/api/v2.0/companies(company)/customers',
      'invalid origin',
    ],
    [
      'non-HTTPS transport',
      'http://api.example.test/v2.0/tenant/environment/api/v2.0/companies(company)/customers',
      'must use HTTPS',
    ],
    [
      'a path outside the company base',
      'https://api.example.test/v2.0/tenant/environment/api/v2.0/companies(other)/customers',
      'outside the company API base',
    ],
  ])('rejects a nextLink using %s', async (_caseName, nextLink, message) => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(
      createJsonResponse(200, {
        value: [],
        '@odata.nextLink': nextLink,
      }),
    );
    const client = new FetchBusinessCentralClient(dependencies);

    await expect(client.query('customers')).rejects.toThrow(message);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it.each([
    '',
    '   ',
    'https://other.example.test/customers',
    '//other.example.test/customers',
    '/customers',
  ])('rejects an empty or absolute resourcePath: %s', async (path) => {
    const { dependencies, fetchFn, getAccessToken } = createDependencies();
    const client = new FetchBusinessCentralClient(dependencies);

    await expect(client.getOne(path)).rejects.toThrow();
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each(['../customers', '%2e%2e/customers', '%252e%252e/customers'])(
    'rejects traversal in resourcePath: %s',
    async (path) => {
      const { dependencies, fetchFn, getAccessToken } = createDependencies();
      const client = new FetchBusinessCentralClient(dependencies);

      await expect(client.query(path)).rejects.toThrow(
        'resourcePath must not contain traversal',
      );
      expect(getAccessToken).not.toHaveBeenCalled();
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );

  it('sends the complete fixed header set', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(createJsonResponse(200, { value: [] }));
    const client = new FetchBusinessCentralClient(dependencies);

    await client.query('customers');

    expectBusinessCentralHeaders(fetchFn.mock.calls[0][1]);
  });

  it('throws BusinessCentralHttpError with bounded, redacted details', async () => {
    const clientSecret = 'client-secret-value';
    const longBody = JSON.stringify({
      token: ACCESS_TOKEN,
      clientSecret,
      detail: 'x'.repeat(5000),
    });
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(createResponse(500, longBody));
    const client = new FetchBusinessCentralClient(dependencies);

    const error = await client.query('customers').catch((value) => value);

    expect(error).toBeInstanceOf(BusinessCentralHttpError);
    expect(error).toMatchObject({
      status: 500,
      operation: 'query',
    });
    expect(error.responseBody).not.toContain(ACCESS_TOKEN);
    expect(error.responseBody).not.toContain(clientSecret);
    expect(error.responseBody.length).toBeLessThanOrEqual(4096);
    expect(String(error)).not.toContain(ACCESS_TOKEN);
    expect(String(error)).not.toContain(clientSecret);
  });

  it('does not convert query HTTP 404 into an empty collection', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(createResponse(404, 'not found'));
    const client = new FetchBusinessCentralClient(dependencies);

    await expect(client.query('customers')).rejects.toMatchObject({
      status: 404,
      operation: 'query',
    });
  });

  it('propagates token and fetch errors unchanged', async () => {
    const tokenError = new Error('Token acquisition failed');
    const tokenDependencies = createDependencies({
      getAccessToken: jest.fn().mockRejectedValue(tokenError),
    });
    const tokenClient = new FetchBusinessCentralClient(
      tokenDependencies.dependencies,
    );

    await expect(tokenClient.getOne('customers(customer-1)')).rejects.toBe(
      tokenError,
    );

    const fetchError = new Error('Network failed');
    const fetchDependencies = createDependencies();
    fetchDependencies.fetchFn.mockRejectedValue(fetchError);
    const fetchClient = new FetchBusinessCentralClient(
      fetchDependencies.dependencies,
    );

    await expect(fetchClient.query('customers')).rejects.toBe(fetchError);
  });

  it('does not modify query options or response values', async () => {
    const options: BusinessCentralQueryOptions = Object.freeze({
      filter: Object.freeze({ countryCode: Object.freeze(['US', 'CA']) }),
      select: Object.freeze(['id']),
    });
    const responseValue = Object.freeze({ id: 'customer-1' });
    const responseValues = Object.freeze([responseValue]);
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(
      createJsonResponse(200, { value: responseValues }),
    );
    const client = new FetchBusinessCentralClient(dependencies);

    const result = await client.query('customers', options);

    expect(options).toEqual({
      filter: { countryCode: ['US', 'CA'] },
      select: ['id'],
    });
    expect(responseValues).toEqual([responseValue]);
    expect(result).toEqual([responseValue]);
  });

  it('uses the injected fetchFn and public exports', async () => {
    const { dependencies, fetchFn } = createDependencies();
    fetchFn.mockResolvedValue(createJsonResponse(200, { value: [] }));
    const client: PublicBusinessCentralHttpClient =
      new PublicFetchBusinessCentralClient(dependencies);

    await client.query('customers');

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(PublicBusinessCentralHttpError).toBe(BusinessCentralHttpError);
  });

  it('contains no write methods, logging, retries, or forced ExternalSystemClient implementation', () => {
    expect(CLIENT_SOURCE).not.toMatch(
      /\b(POST|PATCH|DELETE)\b|console\.|logger|retry|circuit|implements\s+ExternalSystemClient/,
    );
  });
});
