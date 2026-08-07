import { NestFactory } from '@nestjs/core';
import { PayrollServiceModule } from './payroll-service.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(PayrollServiceModule);
  app.enableCors();
  const port = process.env.PAYROLL_SERVICE_PORT || 4005;
  await app.listen(port);
  Logger.log(`💰 Payroll Microservice running on http://localhost:${port}`);
}

bootstrap();
