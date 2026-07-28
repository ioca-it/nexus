import { Module } from '@nestjs/common';

import { DataverseModule } from '../dataverse';
import { AUTHENTICATED_ACTOR_PROVIDERS } from './authenticated-actor.providers';
import { AUTHENTICATED_ACTOR_RESOLVER } from './authenticated-actor.tokens';

@Module({
  imports: [DataverseModule],
  providers: AUTHENTICATED_ACTOR_PROVIDERS,
  exports: [AUTHENTICATED_ACTOR_RESOLVER],
})
export class AuthenticatedActorModule {}
