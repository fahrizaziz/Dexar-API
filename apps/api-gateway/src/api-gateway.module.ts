import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiGatewayController } from './api-gateway.controller';
import { DatabaseModule } from '@app/database';
import { CasbinModule } from '@app/casbin';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CasbinModule,
  ],
  controllers: [ApiGatewayController],
})
export class ApiGatewayModule {}
