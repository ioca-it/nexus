import type { AuthenticatedActorPersistence } from './authenticated-actor.persistence.types';

export interface AuthenticatedActorGateway {
  findByOid(oid: string): Promise<AuthenticatedActorPersistence | null>;
}
