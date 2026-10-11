import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { type RedisClientType } from '@keyv/redis';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

/**
 * Extended Redis service to handle hash operations with JSON serialization
 * @description ```ts
 * // use Inject with Type for better TS typing
 * constructor(@Inject(RedisService) private redisService: RedisServiceType) {}
 * ```
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientType;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly logger: Logger,
  ) {
    this.redisClient = this.cacheManager.stores[0]?.store.client as any;

    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          return Reflect.get(target, prop);
        }

        const value = Reflect.get(target.redisClient, prop);
        if (typeof value === 'function') {
          return value.bind(target.redisClient);
        }
        return value;
      },
    });
  }

  // Set hash field
  async hSet(key: string, field: string, value: any, ttl = 5 * 60) {
    await this.redisClient.hSet(key, field, JSON.stringify(value as any)); // Default 5 minutes expiration
    await this.expire(key, ttl);
  }

  /**
   * Custom hGet with JSON parse
   */
  async hGet(key: string, field: string) {
    const value = await this.redisClient.hGet(key, field);
    if (value === 'null') return value;

    return value ? JSON.parse(value) : null;
  }

  // Get all hash fields
  async hGetAll(key: string) {
    const data = await this.redisClient.hGetAll(key);
    const result: Record<string, any> = {};
    for (const [field, value] of Object.entries(data)) {
      try {
        result[field] = JSON.parse(value as string);
      } catch {
        result[field] = value;
      }
    }
    return result;
  }

  // Set multiple fields
  async hMSet(
    key: string,
    data: Record<string, any>,
    ttl = 5 * 60,
  ): Promise<void> {
    const serialized: Record<string, string> = {};
    for (const [field, value] of Object.entries(data)) {
      serialized[field] = JSON.stringify(value);
    }
    await this.redisClient.hSet(key, serialized);
    await this.expire(key, ttl); // Default 5 minutes expiration
  }

  // Delete hash field
  async hDel(key: string, ...fields: string[]): Promise<number> {
    return await this.redisClient.hDel(key, fields);
  }

  // Get all values
  async hVals(key: string): Promise<any[]> {
    const values = await this.redisClient.hVals(key);
    return values.map((v: string) => {
      try {
        return v === 'null' ? 'null' : JSON.parse(v);
      } catch {
        return v;
      }
    });
  }

  async get(key: string) {
    const value = await this.redisClient.get(key);
    if (value === 'null') return value;

    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttl = 5 * 60) {
    const serializedValue = JSON.stringify(value);
    await this.redisClient.set(key, serializedValue);
    await this.expire(key, ttl); // Default 5 minutes expiration
  }

  async mdel(keyPattern: string): Promise<number> {
    const keys = await this.redisClient.keys(keyPattern);
    if (keys.length === 0) return 0;
    return await this.redisClient.del(keys);
  }

  async expire(
    key: string,
    ttl: number,
    mode?: 'NX' | 'XX' | 'GT' | 'LT' | undefined,
  ): Promise<number> {
    if (ttl <= 0) return 0;
    return await this.redisClient.expire(key, ttl, mode);
  }

  async onModuleInit() {
    await Promise.race([
      this.redisClient.connect().then(() => {
        this.logger.log('Connected to Redis');
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000),
      ),
    ]);
  }
  async onModuleDestroy() {
    await Promise.race([
      this.cacheManager.disconnect().then(() => {
        this.logger.log('Disconnected from Redis');
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Redis disconnection timeout')),
          5000,
        ),
      ),
    ]);
  }
}

/**
 * TS type-safe for RedisService
 */
export type RedisServiceType = RedisService &
  Omit<RedisClientType, keyof RedisService>;
