import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

export function createWinstonOptions(
  level: string,
  nodeEnv: string,
): winston.LoggerOptions {
  const isProduction = nodeEnv === 'production';

  return {
    level,
    transports: [
      new winston.transports.Console({
        format: isProduction
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            )
          : winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              nestWinstonModuleUtilities.format.nestLike('OMS', {
                colors: true,
                prettyPrint: true,
              }),
            ),
      }),
      new winston.transports.File({
        filename: 'storage/logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      new winston.transports.File({
        filename: 'storage/logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
  };
}
