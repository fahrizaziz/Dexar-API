import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayrollServiceController } from './payroll-service.controller';
import { DatabaseModule } from '@app/database';
import { CasbinModule } from '@app/casbin';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CasbinModule,
  ],
  controllers: [PayrollServiceController],
})
export class PayrollServiceModule {}
