export interface BusinessCentralUrlConfig {
  readonly resourceUrl: string;
  readonly tenantId: string;
  readonly environmentName: string;
  readonly apiVersion: string;
  readonly companyId: string;
}

function requirePathSegment(value: string, fieldName: string): string {
  const normalized = value.trim().replace(/^\/+|\/+$/g, '');

  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function normalizeResourceUrl(resourceUrl: string): string {
  const normalized = resourceUrl.trim().replace(/\/+$/, '');

  if (normalized.length === 0) {
    throw new Error('resourceUrl is required');
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error('resourceUrl must be a valid absolute URL');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('resourceUrl must use HTTPS');
  }

  if (parsedUrl.username.length > 0 || parsedUrl.password.length > 0) {
    throw new Error('resourceUrl must not contain credentials');
  }

  if (parsedUrl.search.length > 0 || parsedUrl.hash.length > 0) {
    throw new Error(
      'resourceUrl must not contain query parameters or fragments',
    );
  }

  parsedUrl.pathname = parsedUrl.pathname
    .replace(/\/{2,}/g, '/')
    .replace(/\/+$/, '');

  return parsedUrl.toString().replace(/\/+$/, '');
}

function normalizeApiVersion(apiVersion: string): string {
  const normalized = requirePathSegment(apiVersion, 'apiVersion').replace(
    /^api\/+/i,
    '',
  );

  if (normalized.length === 0 || normalized.includes('/')) {
    throw new Error('apiVersion must be a single path segment');
  }

  return normalized;
}

export function createBusinessCentralApiBaseUrl(
  config: BusinessCentralUrlConfig,
): string {
  const resourceUrl = normalizeResourceUrl(config.resourceUrl);
  const tenantId = requirePathSegment(config.tenantId, 'tenantId');
  const environmentName = requirePathSegment(
    config.environmentName,
    'environmentName',
  );
  const apiVersion = normalizeApiVersion(config.apiVersion);

  return [
    resourceUrl,
    encodePathSegment(tenantId),
    encodePathSegment(environmentName),
    'api',
    encodePathSegment(apiVersion),
  ].join('/');
}

export function createBusinessCentralCompanyBaseUrl(
  config: BusinessCentralUrlConfig,
): string {
  const apiBaseUrl = createBusinessCentralApiBaseUrl(config);
  const companyId = requirePathSegment(config.companyId, 'companyId');

  return `${apiBaseUrl}/companies(${encodePathSegment(companyId)})`;
}
