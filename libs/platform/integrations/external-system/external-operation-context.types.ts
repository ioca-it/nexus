export type ExternalOperationMetadata = Readonly<Record<string, unknown>>;

export interface ExternalOperationContext<
  TMetadata extends ExternalOperationMetadata = ExternalOperationMetadata,
> {
  readonly systemId: string;
  readonly operation: string;
  readonly correlationId?: string;
  readonly metadata?: TMetadata;
}
