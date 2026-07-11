export interface AppConfig {
  nodeEnv: string;
  app: {
    name: string;
    serverHost: string;
  };
  backend: {
    port: number;
    apiPrefix: string;
    swaggerPath: string;
    corsOrigin: string;
  };
  database: {
    url: string;
  };
  redis: {
    url?: string;
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  passwordHash: {
    algorithm: 'argon2' | 'bcrypt';
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromName: string;
    fromEmail: string;
  };
  storage: {
    driver: string;
    root: string;
  };
  rateLimit: {
    ttl: number;
    max: number;
  };
  logging: {
    level: string;
  };
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  app: {
    name: process.env.APP_NAME ?? 'Office Management System',
    serverHost: process.env.SERVER_HOST ?? 'localhost',
  },
  backend: {
    port: parseInt(process.env.BACKEND_PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    swaggerPath: process.env.SWAGGER_PATH ?? 'docs',
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  passwordHash: {
    algorithm:
      (process.env.PASSWORD_HASH_ALGORITHM as 'argon2' | 'bcrypt') ?? 'argon2',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    fromName: process.env.SMTP_FROM_NAME ?? 'Office Management System',
    fromEmail: process.env.SMTP_FROM_EMAIL ?? '',
  },
  storage: {
    driver: process.env.STORAGE_DRIVER ?? 'local',
    root: process.env.STORAGE_ROOT ?? './storage',
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
});
