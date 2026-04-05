import { NextResponse } from 'next/server';
import { getCache, setCache, deleteCache, clearPattern } from './redis';

interface CacheConfig {
  ttlSeconds: number;
  staleWhileRevalidate?: number;
  tags?: string[];
}

// Cache configurations for different data types
export const CACHE_CONFIGS = {
  // Parent data - cache longer, updates less frequently
  parent: {
    dashboard: { ttlSeconds: 60, staleWhileRevalidate: 300 },
    attendance: { ttlSeconds: 120, staleWhileRevalidate: 600 },
    progress: { ttlSeconds: 300, staleWhileRevalidate: 900 },
    fees: { ttlSeconds: 300, staleWhileRevalidate: 900 },
    children: { ttlSeconds: 600, staleWhileRevalidate: 1800 },
  },
  // Teacher data
  teacher: {
    classes: { ttlSeconds: 300, staleWhileRevalidate: 900 },
    assignments: { ttlSeconds: 120, staleWhileRevalidate: 600 },
    attendance: { ttlSeconds: 60, staleWhileRevalidate: 300 },
    students: { ttlSeconds: 300, staleWhileRevalidate: 900 },
  },
  // Admin data
  admin: {
    users: { ttlSeconds: 60, staleWhileRevalidate: 300 },
    analytics: { ttlSeconds: 300, staleWhileRevalidate: 900 },
    reports: { ttlSeconds: 600, staleWhileRevalidate: 1800 },
    settings: { ttlSeconds: 600, staleWhileRevalidate: 1800 },
  },
  // Shared data
  shared: {
    announcements: { ttlSeconds: 60, staleWhileRevalidate: 300 },
    notices: { ttlSeconds: 120, staleWhileRevalidate: 600 },
    profile: { ttlSeconds: 300, staleWhileRevalidate: 900 },
  },
} as const;

/**
 * Enhanced cache wrapper with stale-while-revalidate pattern
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig
): Promise<T> {
  const cacheKey = `cache:${key}`;
  const staleKey = `stale:${key}`;
  
  try {
    // Try to get fresh cache
    const cached = await getCache<{ data: T; timestamp: number }>(cacheKey);
    
    if (cached) {
      const age = (Date.now() - cached.timestamp) / 1000;
      
      // Cache is fresh
      if (age < config.ttlSeconds) {
        return cached.data;
      }
      
      // Cache is stale but acceptable (stale-while-revalidate)
      if (config.staleWhileRevalidate && age < config.ttlSeconds + config.staleWhileRevalidate) {
        // Trigger background refresh
        refreshCache(cacheKey, staleKey, fetchFn, config);
        return cached.data;
      }
    }
    
    // Check if another request is already refreshing
    const isRefreshing = await getCache<string>(staleKey);
    if (isRefreshing) {
      // Wait a bit and check cache again
      await new Promise(resolve => setTimeout(resolve, 100));
      const recheck = await getCache<{ data: T; timestamp: number }>(cacheKey);
      if (recheck) return recheck.data;
    }
    
    // Fetch fresh data
    const data = await fetchFn();
    
    // Store in cache
    await setCache(cacheKey, { data, timestamp: Date.now() }, config.ttlSeconds + (config.staleWhileRevalidate || 0));
    
    return data;
  } catch (error) {
    console.error('[Cache] Error:', error);
    // Fallback to direct fetch
    return fetchFn();
  }
}

/**
 * Background cache refresh
 */
async function refreshCache<T>(
  cacheKey: string,
  staleKey: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig
): Promise<void> {
  try {
    // Mark as refreshing
    await setCache(staleKey, 'refreshing', 30);
    
    const data = await fetchFn();
    await setCache(cacheKey, { data, timestamp: Date.now() }, config.ttlSeconds + (config.staleWhileRevalidate || 0));
    
    // Clear refreshing mark
    await deleteCache(staleKey);
  } catch (error) {
    console.error('[Cache] Background refresh error:', error);
    await deleteCache(staleKey);
  }
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  await clearPattern(`cache:*${pattern}*`);
}

/**
 * Invalidate cache by tags
 */
export async function invalidateCacheByTags(tags: string[]): Promise<void> {
  for (const tag of tags) {
    await clearPattern(`cache:*:${tag}:*`);
    await clearPattern(`cache:*:${tag}`);
  }
}

/**
 * Middleware for API route caching with HTTP headers
 */
export function withHttpCache(
  handler: (req: Request) => Promise<NextResponse>,
  config: CacheConfig
) {
  return async (req: Request): Promise<NextResponse> => {
    const response = await handler(req);
    
    // Add cache headers
    const headerValue = config.staleWhileRevalidate
      ? `private, max-age=${config.ttlSeconds}, stale-while-revalidate=${config.staleWhileRevalidate}`
      : `private, max-age=${config.ttlSeconds}`;
    
    response.headers.set('Cache-Control', headerValue);
    response.headers.set('X-Cache-TTL', String(config.ttlSeconds));
    
    return response;
  };
}

/**
 * Generate cache key for user-scoped data
 */
export function generateUserCacheKey(
  userId: string,
  role: string,
  resource: string,
  params?: Record<string, string>
): string {
  const paramStr = params
    ? ':' + Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join(':')
    : '';
  
  return `${role}:${userId}:${resource}${paramStr}`;
}

/**
 * Multi-layer cache: Redis -> In-Memory -> Fetch
 * For extremely hot data
 */
const memoryCache = new Map<string, { data: unknown; expiry: number }>();

export async function withMultiLayerCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: { memoryTTL: number; redisTTL: number }
): Promise<T> {
  const now = Date.now();
  
  // Check memory cache first (fastest)
  const memCached = memoryCache.get(key);
  if (memCached && memCached.expiry > now) {
    return memCached.data as T;
  }
  
  // Check Redis cache
  const redisCached = await getCache<T>(key);
  if (redisCached) {
    // Populate memory cache
    memoryCache.set(key, { data: redisCached, expiry: now + config.memoryTTL * 1000 });
    return redisCached;
  }
  
  // Fetch and cache in both layers
  const data = await fetchFn();
  
  memoryCache.set(key, { data, expiry: now + config.memoryTTL * 1000 });
  await setCache(key, data, config.redisTTL);
  
  return data;
}

/**
 * Cleanup expired memory cache entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (value.expiry <= now) {
      memoryCache.delete(key);
    }
  }
}, 60000); // Clean every minute
