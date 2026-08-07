import { NestFactory } from '@nestjs/core';
import { AuthServiceModule } from './auth-service.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  app.enableCors();
  const port = process.env.AUTH_SERVICE_PORT || 4001;
  await app.listen(port);
  Logger.log(`🔑 Auth Microservice running on http://localhost:${port}`);
}

bootstrap();
