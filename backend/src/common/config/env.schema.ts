import * as Joi from 'joi';

/**
 * Validates env vars at boot. Mandatory ones throw on missing; optional ones
 * are documented for visibility. ConfigModule integration via validationSchema.
 */
export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3001),

  FRONTEND_URL: Joi.string().uri().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  DB_POOL_MAX: Joi.number().integer().min(1).default(30),
  DB_POOL_MIN: Joi.number().integer().min(0).default(5),
  RUN_MIGRATIONS_ON_BOOT: Joi.boolean().truthy('true').falsy('false').default(true),

  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),

  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),

  BULL_BOARD_USER: Joi.string().optional().allow(''),
  BULL_BOARD_PASS: Joi.string().optional().allow(''),

  EVOLUTION_API_URL: Joi.string().uri().optional().allow(''),
  EVOLUTION_API_KEY: Joi.string().optional().allow(''),

  META_APP_SECRET: Joi.string().optional().allow(''),
  META_VERIFY_TOKEN: Joi.string().optional().allow(''),
  META_ACCESS_TOKEN: Joi.string().optional().allow(''),

  UAZAPI_BASE_URL: Joi.string().uri().optional().allow(''),

  STRIPE_SECRET_KEY: Joi.string().optional().allow(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),

  UPLOAD_ROOT: Joi.string().optional().allow(''),
  AWS_S3_BUCKET: Joi.string().optional().allow(''),
  AWS_REGION: Joi.string().optional().allow(''),
  AWS_ACCESS_KEY_ID: Joi.string().optional().allow(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),

  SMTP_HOST: Joi.string().optional().allow(''),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),
  SMTP_FROM: Joi.string().optional().allow(''),

  GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),

  PLATFORM_ADMIN_EMAILS: Joi.string().optional().allow(''),

  OWNER_EMAIL: Joi.string().email().optional(),
  OWNER_PASSWORD: Joi.string().optional().allow(''),

  SENTRY_DSN: Joi.string().uri().optional().allow(''),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).optional(),
  SENTRY_RELEASE: Joi.string().optional().allow(''),
  ALLOW_SENTRY_TEST: Joi.boolean().truthy('true').falsy('false').default(false),

  AUDIT_RETENTION_DAYS: Joi.number().integer().min(1).default(90),
  AUDIT_PRUNE_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),

  TRASH_RETENTION_DAYS: Joi.number().integer().min(1).default(30),
  TRASH_PRUNE_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),

  ACCOUNT_RETENTION_DAYS: Joi.number().integer().min(1).default(30),
  ACCOUNT_PRUNE_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
}).unknown(true);
