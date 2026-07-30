import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { HealthModule } from '../health/health.module';
import { AuthModule } from '../auth';
import { AuthenticatedActorModule } from './authenticated-actor';
import { CommercialCatalogModule } from './commercial-catalog';
import { FinanceModule } from './finance';
import { PaymentNotificationsModule } from './payment-notifications';
import { OrdersModule } from './orders';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    PaymentNotificationsModule,
    AuthenticatedActorModule,
    FinanceModule,
    CommercialCatalogModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
