import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ApiGatewayController } from './api-gateway.controller';
import { AccessControlController } from './access-control.controller';
import { AuthServiceController } from '../../auth-service/src/auth-service.controller';
import { AuthServiceService } from '../../auth-service/src/auth-service.service';
import { EmployeeServiceController } from '../../employee-service/src/employee-service.controller';
import { AttendanceServiceController, GeofenceServiceController } from '../../attendance-service/src/attendance-service.controller';
import { LeaveServiceController } from '../../leave-service/src/leave-service.controller';
import { PayrollServiceController, AuditLogServiceController } from '../../payroll-service/src/payroll-service.controller';
import { DatabaseModule } from '@app/database';
import { CasbinModule } from '@app/casbin';
import { CloudinaryService } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CasbinModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super_secret_jwt_key_wfh_portal_2026',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [
    ApiGatewayController,
    AccessControlController,
    AuthServiceController,
    EmployeeServiceController,
    AttendanceServiceController,
    GeofenceServiceController,
    LeaveServiceController,
    PayrollServiceController,
    AuditLogServiceController,
  ],
  providers: [AuthServiceService, CloudinaryService],
})
export class ApiGatewayModule {}
