export type BusinessCentralHttpOperation = 'getOne' | 'query';

const MAX_RESPONSE_BODY_LENGTH = 4096;

export class BusinessCentralHttpError extends Error {
  readonly status: number;
  readonly responseBody?: string;
  readonly operation: BusinessCentralHttpOperation;

  constructor(
    status: number,
    operation: BusinessCentralHttpOperation,
    responseBody?: string,
  ) {
    super(`Business Central ${operation} request failed with status ${status}`);
    this.name = 'BusinessCentralHttpError';
    this.status = status;
    this.operation = operation;
    this.responseBody = responseBody
      ? responseBody.slice(0, MAX_RESPONSE_BODY_LENGTH)
      : undefined;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
