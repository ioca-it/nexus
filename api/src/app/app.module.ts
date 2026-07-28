import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { HealthModule } from '../health/health.module';
import { AuthModule } from '../auth';
import { AuthenticatedActorModule } from './authenticated-actor';
import { PaymentNotificationsModule } from './payment-notifications';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    PaymentNotificationsModule,
    AuthenticatedActorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
