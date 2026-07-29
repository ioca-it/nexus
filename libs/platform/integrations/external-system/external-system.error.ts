import type { ExternalOperationContext } from './external-operation-context.types';

export interface ExternalSystemErrorOptions<
  TContext extends ExternalOperationContext = ExternalOperationContext,
> {
  readonly code: string;
  readonly context: TContext;
  readonly cause?: unknown;
}

export class ExternalSystemError<
  TContext extends ExternalOperationContext = ExternalOperationContext,
> extends Error {
  readonly code: string;
  readonly context: TContext;
  readonly cause?: unknown;

  constructor(message: string, options: ExternalSystemErrorOptions<TContext>) {
    super(message);
    this.name = 'ExternalSystemError';
    this.code = options.code;
    this.context = options.context;
    this.cause = options.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
