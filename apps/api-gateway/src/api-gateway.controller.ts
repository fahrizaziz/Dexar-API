import { Controller, Get } from '@nestjs/common';
import { Public } from '@app/common';

@Controller()
export class ApiGatewayController {
  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'UP',
      service: 'API Gateway',
      timestamp: new Date().toISOString(),
    };
  }
}
