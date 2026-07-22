import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { getAuthConfig } from '@nexus/config/auth';

export interface EntraJwtPayload {
  aud: string;
  iss: string;
  oid?: string;
  sub: string;
  tid: string;
  name?: string;
  preferred_username?: string;
  roles?: string[];
  scp?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
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

  validate(payload: EntraJwtPayload): EntraJwtPayload {
    if (!payload.sub || !payload.tid) {
      throw new UnauthorizedException('Invalid Microsoft Entra ID token.');
    }

    return payload;
  }
}
