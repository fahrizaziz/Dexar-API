import { NestFactory } from '@nestjs/core';
import { LeaveServiceModule } from './leave-service.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(LeaveServiceModule);
  app.enableCors();
  const port = process.env.LEAVE_SERVICE_PORT || 4004;
  await app.listen(port);
  Logger.log(`📅 Leave Microservice running on http://localhost:${port}`);
}

bootstrap();
