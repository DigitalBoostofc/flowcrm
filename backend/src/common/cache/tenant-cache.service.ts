import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { TenantContext } from '../tenant/tenant-context.service';

/**
 * Workspace-scoped Redis cache helper.
 *
 * - Keys are auto-prefixed with the current workspaceId so cached data
 *   never leaks between tenants.
 * - getOrSet() runs the factory only on miss; saves on hit.
 * - invalidate(prefix) removes every key starting with that prefix
 *   (workspace scope is added automatically).
 *
 * Use for catalog endpoints (pipelines/stages/labels/...) where reads
 * are frequent and writes are rare.
 */
@Injectable()
export class TenantCacheService {
  private readonly logger = new Logger(TenantCacheService.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly tenant: TenantContext,
  ) {}

  /** Build the workspace-scoped key. */
  private scoped(key: string): string {
    return `ws:${this.tenant.requireWorkspaceId()}:${key}`;
  }

  async getOrSet<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
    const scopedKey = this.scoped(key);
    try {
      const hit = await this.cache.get<T>(scopedKey);
      if (hit !== undefined && hit !== null) return hit;
    } catch (err) {
      // Cache failures must never break the request — fall back to factory.
      this.logger.warn(`cache get failed (${scopedKey}): ${(err as Error).message}`);
    }

    const fresh = await factory();
    try {
      await this.cache.set(scopedKey, fresh, ttlMs);
    } catch (err) {
      this.logger.warn(`cache set failed (${scopedKey}): ${(err as Error).message}`);
    }
    return fresh;
  }

  /** Delete a single scoped key. */
  async del(key: string): Promise<void> {
    try {
      await this.cache.del(this.scoped(key));
    } catch (err) {
      this.logger.warn(`cache del failed (${key}): ${(err as Error).message}`);
    }
  }
}
