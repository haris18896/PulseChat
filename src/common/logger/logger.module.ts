import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { AppLogger } from './logger.service';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { colorize: true, singleLine: true },
              }
            : undefined,
        level: process.env.LOG_LEVEL || 'debug',
        redact: ['req.headers.authorization'], // strip sensitive headers
      },
    }),
  ],
  exports: [PinoLoggerModule],
  providers: [AppLogger],
})
export class LoggerModule {}
