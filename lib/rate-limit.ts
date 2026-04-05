import { NextResponse } from 'next/server';
import { redis } from './redis';

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
  keyPrefix?: string;
}

// Rate limit configurations by role and endpoint type
export const RATE_LIMITS = {
  // Admin operations - more permissive
  admin: {
    default: { windowMs: 60 * 1000, maxRequests: 100 },
    heavy: { windowMs: 60 * 1000, maxRequests: 30 },
    export: { windowMs: 60 * 1000, maxRequests: 10 },
  },
  // Teacher operations
  teacher: {
    default: { windowMs: 60 * 1000, maxRequests: 80 },
    attendance: { windowMs: 60 * 1000, maxRequests: 50 },
    results: { windowMs: 60 * 1000, maxRequests: 30 },
  },
  // Parent operations - most restrictive to prevent abuse
  parent: {
    default: { windowMs: 60 * 1000, maxRequests: 60 },
    polling: { windowMs: 60 * 1000, maxRequests: 30 }, // For frequent polls
    heavy: { windowMs: 60 * 1000, maxRequests: 20 },
  },
  // Public/anonymous - strictest
  public: {
    default: { windowMs: 60 * 1000, maxRequests: 20 },
    login: { windowMs: 5 * 60 * 1000, maxRequests: 5 }, // 5 min window for login
    signup: { windowMs: 15 * 60 * 1000, maxRequests: 3 }, // 15 min window for signup
  },
} as const;

/**
 * Sliding window rate limiter using Redis
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const key = `rate_limit:${config.keyPrefix || 'default'}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  try {
    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    const currentCount = await redis.zcard(key);
    
    if (currentCount >= config.maxRequests) {
      // Get the oldest request to calculate reset time
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetTime = oldest.length > 1 ? parseInt(oldest[1]) + config.windowMs : now + config.windowMs;
      
      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }
    
    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.pexpire(key, config.windowMs);
    
    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetTime: now + config.windowMs,
    };
  } catch (error) {
    console.error('[RateLimit] Redis error:', error);
    return { allowed: false, remaining: 0, resetTime: now + config.windowMs };
  }
}

/**
 * Middleware wrapper for Next.js API routes
 */
export async function rateLimitMiddleware(
  req: Request,
  identifier: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const result = await checkRateLimit(identifier, config);
  
  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
        },
      }
    );
  }
  
  return null;
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(req: Request, userId?: string): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  
  if (userId) {
    return `user:${userId}`;
  }
  
  return `ip:${ip}`;
}

/**
 * Burst limiter for expensive operations
 * Tracks concurrent operations per user
 */
export async function checkBurstLimit(
  userId: string,
  operation: string,
  maxConcurrent: number = 3
): Promise<{ allowed: boolean; current: number }> {
  const key = `burst:${operation}:${userId}`;
  
  try {
    const current = await redis.incr(key);
    
    if (current === 1) {
      // Set expiry on first increment
      await redis.expire(key, 60); // 60 second window
    }
    
    if (current > maxConcurrent) {
      await redis.decr(key); // Rollback
      return { allowed: false, current: current - 1 };
    }
    
    return { allowed: true, current };
  } catch (error) {
    console.error('[BurstLimit] Redis error:', error);
    return { allowed: true, current: 0 };
  }
}

/**
 * Release burst limit after operation completes
 */
export async function releaseBurstLimit(userId: string, operation: string): Promise<void> {
  const key = `burst:${operation}:${userId}`;
  try {
    await redis.decr(key);
  } catch (error) {
    console.error('[BurstLimit] Release error:', error);
  }
}

/**
 * Daily usage tracker for usage-based limits
 */
export async function trackDailyUsage(
  userId: string,
  feature: string,
  increment: number = 1
): Promise<{ current: number; limit: number; remaining: number }> {
  const today = new Date().toISOString().split('T')[0];
  const key = `usage:${feature}:${userId}:${today}`;
  const limit = getDailyLimit(feature);
  
  try {
    const current = await redis.incrby(key, increment);
    
    if (current === increment) {
      // First usage today, set expiry
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 0, 0, 0);
      const ttl = Math.ceil((tomorrow.getTime() - Date.now()) / 1000);
      await redis.expire(key, ttl);
    }
    
    return {
      current,
      limit,
      remaining: Math.max(0, limit - current),
    };
  } catch (error) {
    console.error('[UsageTracker] Redis error:', error);
    return { current: 0, limit, remaining: limit };
  }
}

function getDailyLimit(feature: string): number {
  const limits: Record<string, number> = {
    'image_uploads': 50,
    'exports': 10,
    'announcements': 20,
    'messages': 200,
    'api_calls': 10000,
  };
  
  return limits[feature] || 100;
}
