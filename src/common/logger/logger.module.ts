import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

const isProduction = process.env.NODE_ENV === 'production';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
        transport: !isProduction
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: true,
                translateTime: 'yyyy-mm-dd HH:MM:ss Z',
              },
            }
          : undefined,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            "req.headers['set-cookie']",
          ],
          censor: '[REDACTED]',
        },

        customProps: () => ({
          services: 'pulsechat-api',
          instanceId:
            process.env.INSTANCE_ID || process.env.HOSTNAME || 'local',
          enviroment: process.env.NODE_ENV || 'development',
        }),
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
