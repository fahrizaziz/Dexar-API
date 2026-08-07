import { Module, Global } from '@nestjs/common';
import { CasbinService } from './casbin.service';
import { CasbinGuard } from './casbin.guard';
import { DatabaseModule } from '@app/database';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [CasbinService, CasbinGuard],
  exports: [CasbinService, CasbinGuard],
})
export class CasbinModule {}
