import type { ExternalOperationContext } from './external-operation-context.types';

export interface ExternalResponse<
  TData = unknown,
  TContext extends ExternalOperationContext = ExternalOperationContext,
> {
  readonly context: TContext;
  readonly data: TData;
}
