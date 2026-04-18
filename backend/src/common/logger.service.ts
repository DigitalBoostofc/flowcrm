const SENSITIVE_KEYS = ['apiKey', 'apikey', 'accessToken', 'access_token', 'password', 'passwordHash', 'webhookSecret', 'META_APP_SECRET', 'JWT_SECRET'];

export function redact(obj: unknown): unknown {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
      result[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      result[k] = redact(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}
