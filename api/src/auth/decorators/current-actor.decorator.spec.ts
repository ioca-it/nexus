import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import type { AuthenticatedActor } from '@nexus/platform';

import type { AuthenticatedRequestUser } from '../authenticated-request-user.types';
import {
  CurrentActor as PublicCurrentActor,
  CurrentUser as PublicCurrentUser,
} from '../index';
import { CurrentActor } from './current-actor.decorator';
import { CurrentUser } from './current-user.decorator';
import {
  CurrentActor as DecoratorsCurrentActor,
  CurrentUser as DecoratorsCurrentUser,
} from './index';

jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn(() => jest.fn()),
}));

interface ParameterMetadata {
  readonly factory: (
    data: undefined,
    context: ExecutionContext,
  ) => AuthenticatedActor | AuthenticatedRequestUser;
  readonly index: number;
}

class DecoratedHandler {
  handle(): void {
    return undefined;
  }
}

CurrentUser()(DecoratedHandler.prototype, 'handle', 0);
CurrentActor()(DecoratedHandler.prototype, 'handle', 1);

const routeArguments = Reflect.getMetadata(
  ROUTE_ARGS_METADATA,
  DecoratedHandler,
  'handle',
) as Record<string, ParameterMetadata>;

const parameterFactory = (index: number): ParameterMetadata['factory'] => {
  const metadata = Object.values(routeArguments).find(
    (entry) => entry.index === index,
  );

  if (!metadata) {
    throw new Error(`Missing parameter metadata at index ${index}.`);
  }

  return metadata.factory;
};

const currentUserFactory = parameterFactory(0);
const currentActorFactory = parameterFactory(1);

const actor = Object.freeze({
  userId: 'oid-123',
  customerId: 'customer-1',
  roles: Object.freeze(['Nexus.Admin']),
  permissions: Object.freeze([]),
  approvalGroupIds: Object.freeze(['group-1']),
}) as AuthenticatedActor;

const user = Object.freeze({
  oid: 'oid-123',
  sub: 'subject-1',
  tid: 'tenant-1',
  actor,
}) satisfies AuthenticatedRequestUser;

const executionContext = (request: unknown): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as ExecutionContext;

describe('authenticated request decorators', () => {
  it('returns request.user from CurrentUser', () => {
    expect(currentUserFactory(undefined, executionContext({ user }))).toBe(
      user,
    );
  });

  it('returns request.user.actor from CurrentActor preserving its reference', () => {
    expect(currentActorFactory(undefined, executionContext({ user }))).toBe(
      actor,
    );
  });

  it('rejects a request without user', () => {
    expect(() => currentUserFactory(undefined, executionContext({}))).toThrow(
      UnauthorizedException,
    );
    expect(() => currentActorFactory(undefined, executionContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a request without actor', () => {
    const userWithoutActor = {
      oid: 'oid-123',
      sub: 'subject-1',
      tid: 'tenant-1',
    };

    expect(() =>
      currentActorFactory(
        undefined,
        executionContext({ user: userWithoutActor }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('does not use body, params, query or headers as identity sources', () => {
    const request = {
      user,
      get body(): never {
        throw new Error('body must not be read');
      },
      get params(): never {
        throw new Error('params must not be read');
      },
      get query(): never {
        throw new Error('query must not be read');
      },
      get headers(): never {
        throw new Error('headers must not be read');
      },
    };

    expect(currentUserFactory(undefined, executionContext(request))).toBe(user);
    expect(currentActorFactory(undefined, executionContext(request))).toBe(
      actor,
    );
  });

  it('does not resolve actors, query Dataverse or validate permissions', () => {
    const resolveByOid = jest.fn();
    const dataverseQuery = jest.fn();
    const validatePermissions = jest.fn();

    expect(currentUserFactory(undefined, executionContext({ user }))).toBe(
      user,
    );
    expect(currentActorFactory(undefined, executionContext({ user }))).toBe(
      actor,
    );
    expect(resolveByOid).not.toHaveBeenCalled();
    expect(dataverseQuery).not.toHaveBeenCalled();
    expect(validatePermissions).not.toHaveBeenCalled();
  });

  it('exports both decorators from the decorators and auth entry points', () => {
    expect(DecoratorsCurrentUser).toBe(CurrentUser);
    expect(DecoratorsCurrentActor).toBe(CurrentActor);
    expect(PublicCurrentUser).toBe(CurrentUser);
    expect(PublicCurrentActor).toBe(CurrentActor);
  });
});
