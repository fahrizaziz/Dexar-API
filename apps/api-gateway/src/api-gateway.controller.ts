import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '@app/common';

@Controller()
export class ApiGatewayController {
  @Public()
  @ApiExcludeEndpoint()
  @Get('health')
  getHealth() {
    return {
      status: 'UP',
      service: 'API Gateway',
      timestamp: new Date().toISOString(),
    };
  }
}
