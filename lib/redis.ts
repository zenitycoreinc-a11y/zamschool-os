import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

// Create Redis client with connection pooling and retry logic
export const redis = new Redis(REDIS_URL, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  lazyConnect: true,
});

// Connection event handlers
redis.on('connect', () => {
  console.log('[Redis] Connected to Redis Cloud');
});

redis.on('ready', () => {
  console.log('[Redis] Client ready');
});

redis.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
});

redis.on('reconnecting', () => {
  console.log('[Redis] Reconnecting...');
});

// Cache utilities
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('[Redis] Get cache error:', err);
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error('[Redis] Set cache error:', err);
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.error('[Redis] Delete cache error:', err);
  }
}

export async function clearPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error('[Redis] Clear pattern error:', err);
  }
}

// Distributed lock utility
export async function acquireLock(
  lockKey: string,
  ttlSeconds: number = 30
): Promise<string | null> {
  const token = `${Date.now()}-${Math.random()}`;
  const acquired = await redis.set(lockKey, token, 'EX', ttlSeconds, 'NX');
  return acquired === 'OK' ? token : null;
}

export async function releaseLock(lockKey: string, token: string): Promise<void> {
  const current = await redis.get(lockKey);
  if (current === token) {
    await redis.del(lockKey);
  }
}

export default redis;
