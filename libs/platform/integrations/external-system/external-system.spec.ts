import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ExternalSystemError as PublicExternalSystemError,
  type ExternalOperationContext as PublicExternalOperationContext,
  type ExternalRequest as PublicExternalRequest,
  type ExternalResponse as PublicExternalResponse,
  type ExternalSystemClient as PublicExternalSystemClient,
  type ExternalSystemProvider as PublicExternalSystemProvider,
} from '../../index';
import {
  ExternalSystemError,
  type ExternalOperationContext,
  type ExternalRequest,
  type ExternalResponse,
  type ExternalSystemClient,
  type ExternalSystemProvider,
} from './index';

interface LookupPayload {
  readonly recordId: string;
}

interface LookupData {
  readonly displayName: string;
}

type LookupRequest = ExternalRequest<LookupPayload>;
type LookupResponse = ExternalResponse<LookupData>;
type LookupClient = ExternalSystemClient<LookupRequest, LookupResponse>;

const SOURCE_FILES = [
  'external-operation-context.types.ts',
  'external-request.types.ts',
  'external-response.types.ts',
  'external-system-client.ts',
  'external-system-provider.ts',
  'external-system.error.ts',
]
  .map((fileName) => readFileSync(join(__dirname, fileName), 'utf8'))
  .join('\n');

describe('External Systems Integration Layer', () => {
  it('preserves typed request, response, and operation context', async () => {
    const context: ExternalOperationContext = Object.freeze({
      systemId: 'records-system',
      operation: 'lookup',
      correlationId: 'correlation-1',
      metadata: Object.freeze({ tenant: 'tenant-1' }),
    });
    const request: LookupRequest = Object.freeze({
      context,
      payload: Object.freeze({ recordId: 'record-1' }),
    });
    const response: LookupResponse = Object.freeze({
      context,
      data: Object.freeze({ displayName: 'Record 1' }),
    });
    const client: LookupClient = Object.freeze({
      execute: jest.fn().mockResolvedValue(response),
    });

    await expect(client.execute(request)).resolves.toBe(response);
    expect(client.execute).toHaveBeenCalledWith(request);
  });

  it('allows a provider to expose the same typed client reference', () => {
    const client: LookupClient = {
      execute: jest.fn(),
    };
    const provider: ExternalSystemProvider<LookupRequest, LookupResponse> =
      Object.freeze({
        systemId: 'records-system',
        client,
      });

    expect(provider.systemId).toBe('records-system');
    expect(provider.client).toBe(client);
  });

  it('creates a contextual base error without transforming its cause', () => {
    const context: ExternalOperationContext = Object.freeze({
      systemId: 'records-system',
      operation: 'lookup',
    });
    const cause = new Error('External failure');
    const error = new ExternalSystemError('Operation failed', {
      code: 'operation_failed',
      context,
      cause,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ExternalSystemError);
    expect(error.name).toBe('ExternalSystemError');
    expect(error.message).toBe('Operation failed');
    expect(error.code).toBe('operation_failed');
    expect(error.context).toBe(context);
    expect(error.cause).toBe(cause);
  });

  it('exports every contract through the public Platform entry point', () => {
    const context: PublicExternalOperationContext = {
      systemId: 'records-system',
      operation: 'lookup',
    };
    const request: PublicExternalRequest<LookupPayload> = {
      context,
      payload: { recordId: 'record-1' },
    };
    const response: PublicExternalResponse<LookupData> = {
      context,
      data: { displayName: 'Record 1' },
    };
    const client: PublicExternalSystemClient<typeof request, typeof response> =
      {
        execute: jest.fn().mockResolvedValue(response),
      };
    const provider: PublicExternalSystemProvider<
      typeof request,
      typeof response
    > = {
      systemId: context.systemId,
      client,
    };

    expect(request.context).toBe(context);
    expect(provider.client).toBe(client);
    expect(
      new PublicExternalSystemError('Operation failed', {
        code: 'operation_failed',
        context,
      }),
    ).toBeInstanceOf(ExternalSystemError);
  });

  it('contains no concrete technology or business-module references', () => {
    expect(SOURCE_FILES).not.toMatch(
      /Dataverse|Business Central|Azure|HTTP|OData|Payment Notifications|@nestjs|fetch|axios/i,
    );
  });

  it('contains no concrete client, provider, adapter, or factory implementation', () => {
    expect(SOURCE_FILES).not.toMatch(
      /class\s+(?!ExternalSystemError)|function\s+|create[A-Z]|implements\s+/,
    );
  });
});
