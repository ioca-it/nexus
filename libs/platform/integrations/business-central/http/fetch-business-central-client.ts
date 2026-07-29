import {
  BusinessCentralHttpError,
  type BusinessCentralHttpOperation,
} from './business-central-http.error';
import type {
  BusinessCentralCollectionResponse,
  BusinessCentralHttpClient,
  BusinessCentralQueryOptions,
  BusinessCentralQueryValue,
  FetchBusinessCentralClientDependencies,
} from './business-central-http.types';

const JSON_CONTENT_TYPE = 'application/json';
const FILTER_FIELD_PATTERN = /^[A-Za-z_][A-Za-z0-9_./]*$/;

function normalizeCompanyBaseUrl(companyBaseUrl: string): URL {
  const normalized = companyBaseUrl.trim().replace(/\/+$/, '');

  if (normalized.length === 0) {
    throw new Error('companyBaseUrl is required');
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error('companyBaseUrl must be a valid absolute URL');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('companyBaseUrl must use HTTPS');
  }

  if (parsedUrl.username.length > 0 || parsedUrl.password.length > 0) {
    throw new Error('companyBaseUrl must not contain credentials');
  }

  if (parsedUrl.search.length > 0 || parsedUrl.hash.length > 0) {
    throw new Error(
      'companyBaseUrl must not contain query parameters or fragments',
    );
  }

  parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, '');

  return parsedUrl;
}

function decodePathForValidation(path: string): string {
  let decoded = path;

  for (let iteration = 0; iteration < 2; iteration += 1) {
    try {
      const next = decodeURIComponent(decoded);

      if (next === decoded) {
        break;
      }

      decoded = next;
    } catch {
      throw new Error('resourcePath contains invalid encoding');
    }
  }

  return decoded;
}

function validateRelativeResourcePath(resourcePath: string): string {
  const normalized = resourcePath.trim();

  if (normalized.length === 0) {
    throw new Error('resourcePath is required');
  }

  if (
    normalized.startsWith('/') ||
    normalized.startsWith('\\') ||
    /^[A-Za-z][A-Za-z\d+.-]*:/.test(normalized)
  ) {
    throw new Error('resourcePath must be relative');
  }

  const decodedPath = decodePathForValidation(normalized);
  const pathOnly = decodedPath.split(/[?#]/, 1)[0] ?? '';
  const segments = pathOnly.replace(/\\/g, '/').split('/');

  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('resourcePath must not contain traversal');
  }

  if (normalized.includes('#')) {
    throw new Error('resourcePath must not contain a fragment');
  }

  return normalized;
}

function escapeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

function requireFilterField(field: string): string {
  const normalized = field.trim();

  if (!FILTER_FIELD_PATTERN.test(normalized)) {
    throw new Error('Business Central filter contains an invalid field');
  }

  return normalized;
}

function serializeFilterValue(
  field: string,
  value: BusinessCentralQueryValue,
): string {
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

  throw new Error('Business Central filter contains an unsupported value');
}

function serializeFilter(
  filter: Readonly<Record<string, BusinessCentralQueryValue>>,
): string {
  return Object.entries(filter)
    .map(([field, value]) => {
      const normalizedField = requireFilterField(field);

      return serializeFilterValue(normalizedField, value);
    })
    .join(' and ');
}

function serializeList(values: readonly string[], optionName: string): string {
  const normalized = values.map((value) => value.trim());

  if (normalized.some((value) => value.length === 0)) {
    throw new Error(`${optionName} must not contain empty values`);
  }

  return normalized.join(',');
}

function isCollectionResponse<T>(
  value: unknown,
): value is BusinessCentralCollectionResponse<T> {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('value' in value) ||
    !Array.isArray(value.value)
  ) {
    return false;
  }

  if (!('@odata.nextLink' in value)) {
    return true;
  }

  return (
    value['@odata.nextLink'] === undefined ||
    typeof value['@odata.nextLink'] === 'string'
  );
}

function isResponseObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function redactSensitiveResponseBody(
  responseBody: string,
  accessToken: string,
): string {
  let redacted = responseBody;

  if (accessToken.length > 0) {
    redacted = redacted.split(accessToken).join('[REDACTED]');
  }

  return redacted
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(
      /("(?:clientSecret|client_secret|password|secret|token)"\s*:\s*")[^"]*"/gi,
      '$1[REDACTED]"',
    );
}

export class FetchBusinessCentralClient implements BusinessCentralHttpClient {
  private readonly companyBaseUrl: URL;
  private readonly getAccessToken: () => Promise<string>;
  private readonly fetchFn: typeof fetch;

  constructor(dependencies: FetchBusinessCentralClientDependencies) {
    this.companyBaseUrl = normalizeCompanyBaseUrl(dependencies.companyBaseUrl);
    this.getAccessToken = dependencies.getAccessToken;
    this.fetchFn = dependencies.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  async getOne<T>(resourcePath: string): Promise<T | null> {
    const url = this.resourceUrl(resourcePath);
    const accessToken = await this.getAccessToken();
    const response = await this.fetchFn(url, {
      method: 'GET',
      headers: this.headers(accessToken),
    });

    if (response.status === 404) {
      return null;
    }

    await this.requireSuccess(response, 'getOne', accessToken);
    const value: unknown = await response.json();

    if (!isResponseObject(value)) {
      throw new Error('Invalid Business Central getOne response');
    }

    return value as T;
  }

  async query<T>(
    resourcePath: string,
    options: BusinessCentralQueryOptions = {},
  ): Promise<readonly T[]> {
    const firstUrl = this.queryUrl(resourcePath, options);
    // Opti ChatGPT: reutilización del token durante toda la operación paginada.
    const accessToken = await this.getAccessToken();
    const values: T[] = [];
    const visitedUrls = new Set<string>();
    let nextUrl: string | undefined = firstUrl;

    while (nextUrl !== undefined) {
      if (visitedUrls.has(nextUrl)) {
        throw new Error('Business Central pagination contains a repeated link');
      }

      visitedUrls.add(nextUrl);
      const response = await this.fetchFn(nextUrl, {
        method: 'GET',
        headers: this.headers(accessToken),
      });
      await this.requireSuccess(response, 'query', accessToken);
      const page: unknown = await response.json();

      if (!isCollectionResponse<T>(page)) {
        throw new Error('Invalid Business Central query response');
      }

      values.push(...page.value);
      nextUrl = page['@odata.nextLink']
        ? this.validateNextLink(page['@odata.nextLink'])
        : undefined;
    }

    return Object.freeze(values);
  }

  private resourceUrl(resourcePath: string): string {
    const relativePath = validateRelativeResourcePath(resourcePath);
    const url = new URL(
      relativePath,
      `${this.companyBaseUrl.toString().replace(/\/+$/, '')}/`,
    );

    this.requireWithinCompanyBase(url, 'resourcePath');

    return url.toString();
  }

  private queryUrl(
    resourcePath: string,
    options: BusinessCentralQueryOptions,
  ): string {
    const url = new URL(this.resourceUrl(resourcePath));

    if (options.filter !== undefined) {
      const expression = serializeFilter(options.filter);

      if (expression.length > 0) {
        url.searchParams.set('$filter', expression);
      }
    }

    if (options.select !== undefined) {
      url.searchParams.set('$select', serializeList(options.select, 'select'));
    }

    if (options.expand !== undefined) {
      url.searchParams.set('$expand', serializeList(options.expand, 'expand'));
    }

    if (options.orderBy !== undefined) {
      url.searchParams.set(
        '$orderby',
        serializeList(options.orderBy, 'orderBy'),
      );
    }

    if (options.top !== undefined) {
      if (
        !Number.isInteger(options.top) ||
        options.top < 0 ||
        !Number.isSafeInteger(options.top)
      ) {
        throw new Error('top must be a non-negative safe integer');
      }

      url.searchParams.set('$top', String(options.top));
    }

    return url.toString();
  }

  private validateNextLink(nextLink: string): string {
    let url: URL;

    try {
      url = new URL(nextLink, `${this.companyBaseUrl.toString()}/`);
    } catch {
      throw new Error('Business Central pagination link is invalid');
    }

    if (url.protocol !== 'https:') {
      throw new Error('Business Central pagination link must use HTTPS');
    }

    this.requireWithinCompanyBase(url, 'pagination link');

    return url.toString();
  }

  private requireWithinCompanyBase(url: URL, fieldName: string): void {
    if (url.origin !== this.companyBaseUrl.origin) {
      throw new Error(`Business Central ${fieldName} has an invalid origin`);
    }

    if (url.username.length > 0 || url.password.length > 0) {
      throw new Error(
        `Business Central ${fieldName} must not contain credentials`,
      );
    }

    const basePath = decodePathForValidation(
      this.companyBaseUrl.pathname,
    ).replace(/\/+$/, '');
    const candidatePath = decodePathForValidation(url.pathname).replace(
      /\\/g,
      '/',
    );
    const candidateSegments = candidatePath.split('/');

    if (
      candidateSegments.some((segment) => segment === '.' || segment === '..')
    ) {
      throw new Error(
        `Business Central ${fieldName} is outside the company API base`,
      );
    }

    if (
      candidatePath !== basePath &&
      !candidatePath.startsWith(`${basePath}/`)
    ) {
      throw new Error(
        `Business Central ${fieldName} is outside the company API base`,
      );
    }
  }

  private headers(accessToken: string): Readonly<Record<string, string>> {
    return Object.freeze({
      Authorization: `Bearer ${accessToken}`,
      Accept: JSON_CONTENT_TYPE,
      'Content-Type': JSON_CONTENT_TYPE,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    });
  }

  private async requireSuccess(
    response: Response,
    operation: BusinessCentralHttpOperation,
    accessToken: string,
  ): Promise<void> {
    if (response.ok) {
      return;
    }

    const responseBody = redactSensitiveResponseBody(
      await response.text(),
      accessToken,
    );

    throw new BusinessCentralHttpError(
      response.status,
      operation,
      responseBody || undefined,
    );
  }
}
