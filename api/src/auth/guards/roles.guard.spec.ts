import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedActor } from '@nexus/platform';

import type { AuthenticatedRequestUser } from '../authenticated-request-user.types';
import { RolesGuard } from './roles.guard';

function createActor(roles: readonly string[]): AuthenticatedActor {
  return Object.freeze({
    userId: 'oid-user-1',
    customerId: null,
    roles: Object.freeze([...roles]),
    permissions: Object.freeze([]),
    approvalGroupIds: Object.freeze([]),
  });
}

function createUser(roles: readonly string[]): AuthenticatedRequestUser {
  return Object.freeze({
    oid: 'oid-user-1',
    sub: 'subject-1',
    tid: 'tenant-id',
    actor: createActor(roles),
  });
}

function createContext(user?: unknown): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () =>
      ({
        getRequest: () => ({ user }),
      }) as ReturnType<ExecutionContext['switchToHttp']>,
  } as unknown as ExecutionContext;
}

function createGuard(requiredRoles?: readonly string[]): {
  readonly guard: RolesGuard;
  readonly reflector: jest.Mocked<Reflector>;
} {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as jest.Mocked<Reflector>;

  return {
    guard: new RolesGuard(reflector),
    reflector,
  };
}

describe('RolesGuard', () => {
  it('reads roles exclusively from request.user.actor.roles', () => {
    const { guard } = createGuard(['Nexus.Admin']);

    expect(guard.canActivate(createContext(createUser(['Nexus.Admin'])))).toBe(
      true,
    );
  });

  it('ignores legacy top-level request.user.roles', () => {
    const { guard } = createGuard(['Nexus.Admin']);
    const legacyUser = {
      roles: ['Nexus.Admin'],
      actor: createActor([]),
    };

    expect(guard.canActivate(createContext(legacyUser))).toBe(false);
  });

  it('does not grant a default role when actor roles are empty', () => {
    const { guard } = createGuard(['Nexus.Admin']);

    expect(guard.canActivate(createContext(createUser([])))).toBe(false);
  });

  it('denies a required role when request.user is absent', () => {
    const { guard } = createGuard(['Nexus.Admin']);

    expect(guard.canActivate(createContext())).toBe(false);
  });

  it('allows routes without required role metadata', () => {
    const { guard } = createGuard();

    expect(guard.canActivate(createContext())).toBe(true);
  });
});
