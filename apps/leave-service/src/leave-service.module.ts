import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LeaveServiceController } from './leave-service.controller';
import { DatabaseModule } from '@app/database';
import { CasbinModule } from '@app/casbin';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CasbinModule,
  ],
  controllers: [LeaveServiceController],
})
export class LeaveServiceModule {}
