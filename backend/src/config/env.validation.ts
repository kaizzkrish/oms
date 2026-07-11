import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  SERVER_HOST: Joi.string().required(),
  APP_NAME: Joi.string().default('Office Management System'),

  BACKEND_PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api'),
  SWAGGER_PATH: Joi.string().default('docs'),
  CORS_ORIGIN: Joi.string().default('*'),

  DATABASE_URL: Joi.string().uri().required(),

  REDIS_URL: Joi.string().uri().optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  PASSWORD_HASH_ALGORITHM: Joi.string()
    .valid('argon2', 'bcrypt')
    .default('argon2'),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),
  SMTP_FROM_NAME: Joi.string().default('Office Management System'),
  SMTP_FROM_EMAIL: Joi.string().email({ tlds: false }).required(),

  STORAGE_DRIVER: Joi.string().valid('local', 's3', 'minio').default('local'),
  STORAGE_ROOT: Joi.string().default('./storage'),

  RATE_LIMIT_TTL: Joi.number().positive().default(60),
  RATE_LIMIT_MAX: Joi.number().positive().default(100),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'debug')
    .default('info'),
}).unknown(true);
