import {
  createBusinessCentralApiBaseUrl,
  createBusinessCentralCompanyBaseUrl,
  type BusinessCentralUrlConfig,
} from './business-central-url';

const config: BusinessCentralUrlConfig = Object.freeze({
  resourceUrl: 'https://api.example.test/v2.0',
  tenantId: 'tenant-id',
  environmentName: 'Production',
  apiVersion: 'v2.0',
  companyId: 'company-id',
});

describe('Business Central URL composition', () => {
  it('builds the standard API base URL', () => {
    expect(createBusinessCentralApiBaseUrl(config)).toBe(
      'https://api.example.test/v2.0/tenant-id/Production/api/v2.0',
    );
  });

  it('builds the company base URL', () => {
    expect(createBusinessCentralCompanyBaseUrl(config)).toBe(
      'https://api.example.test/v2.0/tenant-id/Production/api/v2.0/companies(company-id)',
    );
  });

  it('trims values, removes redundant slashes, and escapes path segments', () => {
    const paddedConfig: BusinessCentralUrlConfig = Object.freeze({
      resourceUrl: '  https://api.example.test//v2.0///  ',
      tenantId: ' /tenant id/ ',
      environmentName: ' /Production East/ ',
      apiVersion: ' /v2.0/ ',
      companyId: ' /company (east)/ ',
    });

    expect(createBusinessCentralCompanyBaseUrl(paddedConfig)).toBe(
      'https://api.example.test/v2.0/tenant%20id/Production%20East/api/v2.0/companies(company%20%28east%29)',
    );
  });

  it('does not duplicate an api prefix already present in apiVersion', () => {
    const url = createBusinessCentralApiBaseUrl({
      ...config,
      apiVersion: '/api/v2.0/',
    });

    expect(url).toBe(
      'https://api.example.test/v2.0/tenant-id/Production/api/v2.0',
    );
  });

  it.each([
    ['resourceUrl', ''],
    ['tenantId', '   '],
    ['environmentName', ''],
    ['apiVersion', ' /// '],
    ['companyId', '   '],
  ] as const)('rejects an empty %s', (fieldName, value) => {
    expect(() =>
      createBusinessCentralCompanyBaseUrl({
        ...config,
        [fieldName]: value,
      }),
    ).toThrow(`${fieldName} is required`);
  });

  it('rejects credentials in resourceUrl', () => {
    expect(() =>
      createBusinessCentralApiBaseUrl({
        ...config,
        resourceUrl: 'https://user:password@api.example.test/v2.0',
      }),
    ).toThrow('resourceUrl must not contain credentials');
  });

  it('does not modify the provided config', () => {
    const input = Object.freeze({ ...config });
    const snapshot = { ...input };

    createBusinessCentralCompanyBaseUrl(input);

    expect(input).toEqual(snapshot);
  });
});
