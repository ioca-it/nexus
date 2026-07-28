export interface FetchDataverseClientDependencies {
  readonly baseUrl: string;
  readonly getAccessToken: () => Promise<string>;
  readonly fetchFn?: typeof fetch;
}

export class DataverseHttpError extends Error {
  readonly status: number;
  readonly responseBody?: string;

  constructor(status: number, responseBody?: string) {
    super(`Dataverse HTTP request failed with status ${status}`);
    this.name = 'DataverseHttpError';
    this.status = status;
    this.responseBody = responseBody;
  }
}
