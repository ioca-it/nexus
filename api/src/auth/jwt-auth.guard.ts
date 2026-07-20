import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // Temporalmente permite todas las solicitudes.
    // Será reemplazado por la validación con Microsoft Entra ID.
    return true;
  }
}
