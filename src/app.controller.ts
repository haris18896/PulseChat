import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'pulsechat',
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    };
  }
}
