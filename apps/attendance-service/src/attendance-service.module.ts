import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AttendanceServiceController, GeofenceServiceController } from './attendance-service.controller';
import { DatabaseModule } from '@app/database';
import { CasbinModule } from '@app/casbin';
import { CloudinaryService } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CasbinModule,
  ],
  controllers: [AttendanceServiceController, GeofenceServiceController],
  providers: [CloudinaryService],
})
export class AttendanceServiceModule {}
