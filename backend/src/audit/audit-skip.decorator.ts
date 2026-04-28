import { SetMetadata } from '@nestjs/common';

export const AUDIT_SKIP_KEY = 'audit:skip';

/**
 * Marks a controller or handler so the AuditInterceptor ignores it.
 * Use sparingly — only for endpoints that legitimately don't need audit
 * (e.g., heavily-trafficked internal pings, file uploads where the body
 * is binary).
 */
export const AuditSkip = (): MethodDecorator & ClassDecorator => SetMetadata(AUDIT_SKIP_KEY, true);
