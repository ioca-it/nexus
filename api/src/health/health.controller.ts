import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '../auth';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'nexus-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('secure')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Nexus.Admin')
  secureCheck() {
    return {
      status: 'ok',
      authenticated: true,
      requiredRole: 'Nexus.Admin',
      service: 'nexus-api',
      timestamp: new Date().toISOString(),
    };
  }
}
