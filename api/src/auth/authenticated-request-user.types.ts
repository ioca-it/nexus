import type { AuthenticatedActor } from '@nexus/platform';

export interface AuthenticatedRequestUser {
  readonly oid: string;
  readonly sub: string;
  readonly tid: string;
  readonly actor: AuthenticatedActor;
}
