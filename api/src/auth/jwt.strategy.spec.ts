const AUTH_VARIABLES = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID'] as const;

const UNUSED_INTEGRATION_VARIABLES = [
  ['Dataverse', ['DATAVERSE_ENVIRONMENT_URL', 'DATAVERSE_API_VERSION']],
  ['Business Central', ['BC_TENANT_ID', 'BC_ENVIRONMENT', 'BC_COMPANY_ID']],
  ['Azure Storage', ['AZURE_STORAGE_ACCOUNT_NAME']],
  ['Azure Key Vault', ['AZURE_KEY_VAULT_URL']],
] as const;

const MANAGED_VARIABLES = [
  ...AUTH_VARIABLES,
  'API_URL',
  'FRONTEND_URL',
  'AZURE_CLIENT_SECRET',
  'APPLICATIONINSIGHTS_CONNECTION_STRING',
  ...UNUSED_INTEGRATION_VARIABLES.flatMap(([, variables]) => variables),
] as const;

const originalEnvironment = new Map(
  MANAGED_VARIABLES.map((name) => [name, process.env[name]])
);

const createJwtStrategy = async (): Promise<unknown> => {
  const { JwtStrategy } = await import('./jwt.strategy');

  return new JwtStrategy();
};

describe('JwtStrategy Auth configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('jwks-rsa', () => ({
      passportJwtSecret: jest.fn(() => jest.fn()),
    }));

    for (const name of MANAGED_VARIABLES) {
      delete process.env[name];
    }

    process.env['AZURE_TENANT_ID'] = 'tenant-id';
    process.env['AZURE_CLIENT_ID'] = 'client-id';
  });

  afterAll(() => {
    for (const [name, value] of originalEnvironment) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it('initializes with only the required Auth variables', async () => {
    await expect(createJwtStrategy()).resolves.toBeDefined();
  });

  it.each(UNUSED_INTEGRATION_VARIABLES)(
    'does not require %s configuration',
    async (_integration, variables) => {
      for (const name of variables) {
        expect(process.env[name]).toBeUndefined();
      }

      await expect(createJwtStrategy()).resolves.toBeDefined();
    }
  );

  it('reports a missing AZURE_TENANT_ID', async () => {
    delete process.env['AZURE_TENANT_ID'];

    await expect(createJwtStrategy()).rejects.toThrow(
      'Missing required environment variables: AZURE_TENANT_ID'
    );
  });

  it('reports a missing AZURE_CLIENT_ID', async () => {
    delete process.env['AZURE_CLIENT_ID'];

    await expect(createJwtStrategy()).rejects.toThrow(
      'Missing required environment variables: AZURE_CLIENT_ID'
    );
  });
});
