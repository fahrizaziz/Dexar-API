import { NestFactory } from '@nestjs/core';
import { EmployeeServiceModule } from './employee-service.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(EmployeeServiceModule);
  app.enableCors();
  const port = process.env.EMPLOYEE_SERVICE_PORT || 4002;
  await app.listen(port);
  Logger.log(`👥 Employee Microservice running on http://localhost:${port}`);
}

bootstrap();
