import { NestFactory } from '@nestjs/core';
import { AttendanceServiceModule } from './attendance-service.module';
import { Logger } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AttendanceServiceModule);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.enableCors();

  const port = process.env.ATTENDANCE_SERVICE_PORT || 4003;
  await app.listen(port);
  Logger.log(`⏱️ Attendance Microservice running on http://localhost:${port}`);
}

bootstrap();
