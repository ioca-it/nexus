import type { ExternalOperationContext } from './external-operation-context.types';

export interface ExternalRequest<
  TPayload = unknown,
  TContext extends ExternalOperationContext = ExternalOperationContext,
> {
  readonly context: TContext;
  readonly payload: TPayload;
}
