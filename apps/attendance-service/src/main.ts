import { NestFactory } from '@nestjs/core';
import { AttendanceServiceModule } from './attendance-service.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AttendanceServiceModule);
  app.enableCors();
  const port = process.env.ATTENDANCE_SERVICE_PORT || 4003;
  await app.listen(port);
  Logger.log(`⏱️ Attendance Microservice running on http://localhost:${port}`);
}

bootstrap();
