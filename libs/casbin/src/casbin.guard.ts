import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { CasbinService } from './casbin.service';
import { IS_PUBLIC_KEY } from '@app/common/decorators/public.decorator';

@Injectable()
export class CasbinGuard implements CanActivate {
  private readonly logger = new Logger(CasbinGuard.name);

  constructor(
    private readonly casbinService: CasbinService,
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    let user = request.user;

    // Automatically parse Bearer JWT token if user context isn't attached yet
    if (!user) {
      const authHeader = request.headers.authorization || request.headers.Authorization;
      if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          user = this.jwtService.verify(token, {
            secret: process.env.JWT_SECRET || 'super_secret_jwt_key_wfh_portal_2026',
          });
          request.user = user;
        } catch (err: any) {
          this.logger.warn(`JWT verification failed: ${err.message}`);
        }
      }
    }

    if (!user) {
      this.logger.warn('Forbidden: User context is missing in request.');
      throw new ForbiddenException('Sesi autentikasi tidak valid. Harap login kembali.');
    }

    const sub = user.role || 'KARYAWAN';
    const obj = request.route ? request.route.path : request.url;
    const act = request.method;

    // Enforce RBAC permission
    const isAllowed = await this.casbinService.enforce(sub, obj, act);

    if (!isAllowed) {
      this.logger.warn(`Casbin Forbidden Access: Role [${sub}] -> ${act} ${obj}`);
      throw new ForbiddenException(
        `Akses Ditolak (Casbin RBAC): Role [${sub}] tidak memiliki izin untuk ${act} ${obj}`
      );
    }

    return true;
  }
}
