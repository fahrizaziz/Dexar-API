import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CasbinService } from './casbin.service';
import { CasbinGuard } from './casbin.guard';
import { DatabaseModule } from '@app/database';

@Global()
@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super_secret_jwt_key_wfh_portal_2026',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [CasbinService, CasbinGuard],
  exports: [CasbinService, CasbinGuard, JwtModule],
})
export class CasbinModule {}
