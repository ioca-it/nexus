import type { ExternalSystemClient } from './external-system-client';
import type { ExternalRequest } from './external-request.types';
import type { ExternalResponse } from './external-response.types';

export interface ExternalSystemProvider<
  TRequest extends ExternalRequest = ExternalRequest,
  TResponse extends ExternalResponse = ExternalResponse,
> {
  readonly systemId: string;
  readonly client: ExternalSystemClient<TRequest, TResponse>;
}
