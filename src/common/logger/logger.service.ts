import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(
  ({ level, message, timestamp, stack, context, ...meta }) => {
    const ctx = typeof context === 'string' && context ? `[${context}]` : '';
    const err = typeof stack === 'string' && stack ? `\n${stack}` : '';
    const ts = typeof timestamp === 'string' ? timestamp : '';
    const msg = typeof message === 'string' ? message : '';
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} ${level} ${ctx} ${msg}${extra}${err}`;
  },
);

@Injectable({ scope: Scope.DEFAULT })
export class AppLogger implements LoggerService {
  private readonly logger: Logger;
  private context?: string;

  constructor() {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'debug',
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      ),
      transports: [
        // Console: colorinze for human reading
        new transports.Console({
          format: combine(
            colorize({ all: true }),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logFormat,
          ),
        }),
        // File: structured JSON for parsing/shipping
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: combine(timestamp(), format.json()),
        }),
        new transports.File({
          filename: 'logs/combined.log',
          format: combine(timestamp(), format.json()),
        }),
      ],
    });
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context: context ?? this.context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, {
      context: context ?? this.context,
      stack: trace,
    });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context: context ?? this.context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context: context ?? this.context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context: context ?? this.context });
  }

  isLevelEnabled(level: string): boolean {
    return this.logger.isLevelEnabled(level);
  }

  getContext(): string | undefined {
    return this.context;
  }
}
