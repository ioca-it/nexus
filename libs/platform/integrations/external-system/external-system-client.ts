import type { ExternalRequest } from './external-request.types';
import type { ExternalResponse } from './external-response.types';

export interface ExternalSystemClient<
  TRequest extends ExternalRequest = ExternalRequest,
  TResponse extends ExternalResponse = ExternalResponse,
> {
  readonly execute: (request: TRequest) => Promise<TResponse>;
}
