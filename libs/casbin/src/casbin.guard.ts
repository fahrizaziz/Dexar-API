import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CasbinService } from './casbin.service';
import { IS_PUBLIC_KEY } from '@app/common/decorators/public.decorator';

@Injectable()
export class CasbinGuard implements CanActivate {
  private readonly logger = new Logger(CasbinGuard.name);

  constructor(
    private readonly casbinService: CasbinService,
    private readonly reflector: Reflector,
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
    const user = request.user;

    if (!user) {
      this.logger.warn('Forbidden: User context is missing in request.');
      throw new ForbiddenException('Sesi autentikasi tidak valid atau belum login.');
    }

    const sub = user.role; // e.g. 'KARYAWAN' or 'HRD_ADMIN'
    const obj = request.route ? request.route.path : request.url; // e.g. '/api/v1/employees'
    const act = request.method; // e.g. 'GET', 'POST', 'DELETE'

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
