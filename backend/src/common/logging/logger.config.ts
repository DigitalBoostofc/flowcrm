import { LoggerModule, Params } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';

const SENSITIVE_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-hub-signature-256"]',
  'req.headers["stripe-signature"]',
  'req.body.password',
  'req.body.newPassword',
  'req.body.passwordHash',
  'req.body.resetToken',
  'req.body.otpToken',
  'req.body.code',
  'req.body.token',
  'req.body.secret',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
  '*.apiKey',
  '*.webhookSecret',
];

function resolvePrettyTransport(): { target: string; options: Record<string, unknown> } | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;
  try {
    return {
      target: require.resolve('pino-pretty'),
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname,req,res,responseTime,context',
        singleLine: true,
      },
    };
  } catch {
    return undefined;
  }
}

export function buildLoggerParams(): Params {
  const isProd = process.env.NODE_ENV === 'production';
  const level = process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug');

  return {
    pinoHttp: {
      level,
      genReqId: (req: IncomingMessage) => {
        const incoming = req.headers['x-correlation-id'] ?? req.headers['x-request-id'];
        const correlationId = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
        (req as any).id = correlationId;
        return correlationId;
      },
      customProps: (req: IncomingMessage) => ({
        correlationId: (req as any).id,
      }),
      customSuccessMessage: (req, res) => `${req.method} ${(req as any).url} → ${(res as ServerResponse).statusCode}`,
      customErrorMessage: (req, res, err) => `${req.method} ${(req as any).url} → ${(res as ServerResponse).statusCode}: ${err.message}`,
      autoLogging: {
        ignore: (req) => {
          const url = (req as any).url ?? '';
          return url.startsWith('/api/health') || url === '/favicon.ico';
        },
      },
      redact: {
        paths: SENSITIVE_PATHS,
        censor: '[REDACTED]',
      },
      transport: resolvePrettyTransport(),
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
        }),
        res: (res) => ({
          statusCode: res.statusCode,
        }),
      },
    },
  };
}

export const PinoLoggerModule = LoggerModule.forRoot(buildLoggerParams());
