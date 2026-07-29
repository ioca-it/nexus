export type BusinessCentralQueryValue =
  | string
  | number
  | boolean
  | readonly string[];

export interface BusinessCentralQueryOptions {
  readonly filter?: Readonly<Record<string, BusinessCentralQueryValue>>;
  readonly select?: readonly string[];
  readonly expand?: readonly string[];
  readonly orderBy?: readonly string[];
  readonly top?: number;
}

export interface BusinessCentralCollectionResponse<T> {
  readonly value: readonly T[];
  readonly '@odata.nextLink'?: string;
}

export interface BusinessCentralHttpClient {
  getOne<T>(resourcePath: string): Promise<T | null>;

  query<T>(
    resourcePath: string,
    options?: BusinessCentralQueryOptions,
  ): Promise<readonly T[]>;
}

export interface FetchBusinessCentralClientDependencies {
  readonly companyBaseUrl: string;
  readonly getAccessToken: () => Promise<string>;
  readonly fetchFn?: typeof fetch;
}
