import type { AuthenticatedActor } from './authenticated-actor.types';

export interface AuthenticatedActorResolver {
  resolveByOid(oid: string): Promise<AuthenticatedActor | null>;
}
