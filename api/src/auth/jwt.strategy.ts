import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { getAuthConfig } from '@nexus/config/auth';
import type {
  AuthenticatedActor,
  AuthenticatedActorResolver,
} from '@nexus/platform';

import { AUTHENTICATED_ACTOR_RESOLVER } from '../app/authenticated-actor/authenticated-actor.tokens';
import type { AuthenticatedRequestUser } from './authenticated-request-user.types';

export interface EntraJwtPayload {
  readonly aud: string;
  readonly iss: string;
  readonly oid?: string;
  readonly sub: string;
  readonly tid: string;
  readonly name?: string;
  readonly preferred_username?: string;
  readonly roles?: readonly string[];
  readonly scp?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(AUTHENTICATED_ACTOR_RESOLVER)
    private readonly authenticatedActorResolver: AuthenticatedActorResolver,
  ) {
    const { tenantId, clientId } = getAuthConfig();

    if (!tenantId || !clientId) {
      throw new Error(
        'Microsoft Entra ID authentication configuration is incomplete.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: clientId,
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      algorithms: ['RS256'],
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      }),
    });
  }

  async validate(payload: EntraJwtPayload): Promise<AuthenticatedRequestUser> {
    if (!payload.sub?.trim() || !payload.tid?.trim()) {
      throw new UnauthorizedException('Invalid Microsoft Entra ID token.');
    }

    const oid = payload.oid?.trim();
    if (!oid) {
      throw new UnauthorizedException('Invalid Microsoft Entra ID token.');
    }

    let actor: AuthenticatedActor | null;

    try {
      actor = await this.authenticatedActorResolver.resolveByOid(oid);
    } catch {
      throw new InternalServerErrorException(
        'Unable to resolve authenticated NEXUS user.',
      );
    }

    if (actor === null || actor.userId !== oid) {
      throw new UnauthorizedException(
        'Authenticated NEXUS user is not authorized.',
      );
    }

    return Object.freeze({
      oid,
      sub: payload.sub,
      tid: payload.tid,
      actor,
    });
  }
}
