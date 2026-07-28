import type { AuthenticatedActorResolver } from '../authenticated-actor-resolver';
import type { AuthenticatedActor } from '../authenticated-actor.types';
import {
  authenticatedActorMapper,
  type AuthenticatedActorMapper,
} from './authenticated-actor.mapper';
import type { AuthenticatedActorGateway } from './authenticated-actor.gateway';

export class DataverseAuthenticatedActorResolver
  implements AuthenticatedActorResolver
{
  private readonly gateway: AuthenticatedActorGateway;
  private readonly mapper: AuthenticatedActorMapper;

  constructor(
    gateway: AuthenticatedActorGateway,
    mapper: AuthenticatedActorMapper = authenticatedActorMapper,
  ) {
    this.gateway = gateway;
    this.mapper = mapper;
  }

  async resolveByOid(oid: string): Promise<AuthenticatedActor | null> {
    const normalizedOid = oid.trim();

    if (normalizedOid.length === 0) {
      throw new Error('oid is required');
    }

    const persistence = await this.gateway.findByOid(normalizedOid);

    if (persistence === null) {
      return null;
    }

    return this.mapper.toAuthenticatedActor(persistence);
  }
}
