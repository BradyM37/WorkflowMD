/**
 * Caching Layer - Redis with In-Memory Fallback
 * Provides transparent caching with automatic failover
 */

import Redis from 'ioredis';
import { logger } from './logger';

// In-memory cache fallback (using Map with LRU-like behavior)
class InMemoryCache {
  private cache: Map<string, { value: any; expires: number }> = new Map();
  private maxSize = 1000; // Maximum items to cache

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check expiration
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds: number = 300): Promise<void> {
    // Simple LRU: delete oldest if over size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async flushall(): Promise<void> {
    this.cache.clear();
  }

  getSize(): number {
    return this.cache.size;
  }
}

// Cache manager
class CacheManager {
  private redis: Redis | null = null;
  private fallback: InMemoryCache = new InMemoryCache();
  private useRedis: boolean = false;
  private connectionAttempts: number = 0;
  private maxRetries: number = 3;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    const REDIS_URL = process.env.REDIS_URL;

    if (!REDIS_URL) {
      logger.info('Redis URL not configured, using in-memory cache');
      return;
    }

    try {
      this.redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy: (times: number) => {
          if (times > this.maxRetries) {
            logger.warn('Redis max retries exceeded, falling back to in-memory cache');
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 3000);
          return delay;
        }
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
        this.useRedis = true;
        this.connectionAttempts = 0;
      });

      this.redis.on('ready', () => {
        logger.info('Redis ready to accept commands');
      });

      this.redis.on('error', (error) => {
        this.connectionAttempts++;
        logger.error('Redis connection error', {
          attempts: this.connectionAttempts,
          useRedis: this.useRedis
        }, error);

        // Fallback to in-memory after multiple failures
        if (this.connectionAttempts >= this.maxRetries) {
          this.useRedis = false;
          logger.warn('Redis unavailable, using in-memory cache');
        }
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed');
        this.useRedis = false;
      });

      this.redis.on('reconnecting', () => {
        logger.info('Attempting to reconnect to Redis');
      });

    } catch (error) {
      logger.error('Failed to initialize Redis', {}, error as Error);
      this.useRedis = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (this.useRedis && this.redis) {
        const value = await this.redis.get(key);
        
        if (value) {
          try {
            return JSON.parse(value) as T;
          } catch {
            return value as T;
          }
        }
        return null;
      } else {
        const value = await this.fallback.get(key);
        if (value) {
          try {
            return JSON.parse(value) as T;
          } catch {
            return value as T;
          }
        }
        return null;
      }
    } catch (error) {
      logger.error('Cache get error', { key }, error as Error);
      // Fallback to in-memory on error
      if (this.useRedis) {
        this.useRedis = false;
        return this.fallback.get(key) as Promise<T | null>;
      }
      return null;
    }
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache (will be JSON stringified)
   * @param ttlSeconds Time to live in seconds (default: 5 minutes)
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (this.useRedis && this.redis) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.fallback.set(key, serialized, ttlSeconds);
      }
    } catch (error) {
      logger.error('Cache set error', { key, ttl: ttlSeconds }, error as Error);
      // Try fallback
      if (this.useRedis) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        await this.fallback.set(key, serialized, ttlSeconds);
      }
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.del(key);
      } else {
        await this.fallback.del(key);
      }
    } catch (error) {
      logger.error('Cache delete error', { key }, error as Error);
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (this.useRedis && this.redis) {
        const result = await this.redis.exists(key);
        return result === 1;
      } else {
        const value = await this.fallback.get(key);
        return value !== null;
      }
    } catch (error) {
      logger.error('Cache exists error', { key }, error as Error);
      return false;
    }
  }

  /**
   * Flush all cache entries
   */
  async flush(): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.flushall();
      } else {
        await this.fallback.flushall();
      }
      logger.info('Cache flushed successfully');
    } catch (error) {
      logger.error('Cache flush error', {}, error as Error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { type: string; size?: number; connected?: boolean } {
    if (this.useRedis && this.redis) {
      return {
        type: 'redis',
        connected: this.redis.status === 'ready'
      };
    } else {
      return {
        type: 'in-memory',
        size: this.fallback.getSize()
      };
    }
  }

  /**
   * Wrap a function with caching
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttlSeconds);
    return result;
  }

  /**
   * Close Redis connection (for graceful shutdown)
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      logger.info('Redis connection closed');
    }
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Cache key helpers
export const CacheKeys = {
  workflow: (locationId: string, workflowId: string) => 
    `workflow:${locationId}:${workflowId}`,
  
  workflows: (locationId: string) => 
    `workflows:${locationId}`,
  
  analysis: (workflowId: string) => 
    `analysis:${workflowId}`,
  
  user: (locationId: string) => 
    `user:${locationId}`,
  
  subscription: (locationId: string) => 
    `subscription:${locationId}`
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 1800,          // 30 minutes
  ANALYSIS: 3600,      // 1 hour (analysis results are expensive)
  WORKFLOW: 60,        // 1 minute (keep fresh for new workflow visibility)
  USER: 900            // 15 minutes
};
