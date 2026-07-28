import { createDataverseBaseUrl } from './dataverse-url';

describe('createDataverseBaseUrl', () => {
  it('composes the Dataverse Web API URL', () => {
    expect(
      createDataverseBaseUrl('https://example.crm.dynamics.com', 'v9.2'),
    ).toBe('https://example.crm.dynamics.com/api/data/v9.2');
  });

  it('trims spaces and removes surplus slashes', () => {
    expect(
      createDataverseBaseUrl(
        '  https://example.crm.dynamics.com///  ',
        '  ///v9.2///  ',
      ),
    ).toBe('https://example.crm.dynamics.com/api/data/v9.2');
  });

  it.each(['', '   ', ' /// '])(
    'rejects an empty environmentUrl represented by %p',
    (environmentUrl) => {
      expect(() => createDataverseBaseUrl(environmentUrl, 'v9.2')).toThrow(
        'Dataverse environmentUrl is required',
      );
    },
  );

  it.each(['', '   ', ' /// '])(
    'rejects an empty apiVersion represented by %p',
    (apiVersion) => {
      expect(() =>
        createDataverseBaseUrl('https://example.crm.dynamics.com', apiVersion),
      ).toThrow('Dataverse apiVersion is required');
    },
  );
});
