export function createDataverseBaseUrl(
  environmentUrl: string,
  apiVersion: string,
): string {
  const normalizedEnvironmentUrl = environmentUrl.trim().replace(/\/+$/, '');
  if (normalizedEnvironmentUrl.length === 0) {
    throw new Error('Dataverse environmentUrl is required');
  }

  const normalizedApiVersion = apiVersion.trim().replace(/^\/+|\/+$/g, '');
  if (normalizedApiVersion.length === 0) {
    throw new Error('Dataverse apiVersion is required');
  }

  return `${normalizedEnvironmentUrl}/api/data/${normalizedApiVersion}`;
}
