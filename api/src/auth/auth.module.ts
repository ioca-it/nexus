import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { AuthenticatedActorModule } from '../app/authenticated-actor';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    AuthenticatedActorModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],
  providers: [JwtStrategy],
  exports: [PassportModule, JwtStrategy],
})
export class AuthModule {}
