import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

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
  constructor(configService: ConfigService) {
    const tenantId = configService.get<string>('auth.tenantId');
    const audience = configService.get<string>('auth.audience');

    if (!tenantId || !audience) {
      throw new Error(
        'Microsoft Entra ID authentication configuration is incomplete.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience,
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
