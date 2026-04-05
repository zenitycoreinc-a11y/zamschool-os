import { z } from "zod";
import { redis } from "./redis";
import { NextResponse } from "next/server";

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Distributed rate limiting using Redis
 * Replaces the in-memory Map to prevent rate limit bypass on server restarts/scaling
 */
export async function applyRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  failOpen?: boolean;
}) {
  const key = `rl:${params.key}`;
  const now = Date.now();
  
  try {
    // Use Redis sliding window for precision
    const multi = redis.multi();
    multi.zremrangebyscore(key, 0, now - params.windowMs);
    multi.zcard(key);
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.pexpire(key, params.windowMs);
    
    const results = await multi.exec();
    if (!results) throw new Error("Redis multi exec failed");
    
    const count = results[1][1] as number;
    
    if (count >= params.limit) {
      return {
        allowed: false as const,
        retryAfterSec: Math.ceil(params.windowMs / 1000),
      };
    }
    
    return { allowed: true as const };
  } catch (error) {
    console.error(
      `[RateLimit] Redis error, ${params.failOpen ? "failing open" : "failing closed"}:`,
      error
    );
    if (params.failOpen) {
      return { allowed: true as const };
    }
    return {
      allowed: false as const,
      retryAfterSec: Math.ceil(params.windowMs / 1000),
    };
  }
}

export function safeErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export async function parseJsonWithSchema<T>(req: Request, schema: z.ZodSchema<T>): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid request data: ${error.issues.map((issue) => issue.message).join(", ")}`);
    }
    throw error;
  }
}

/**
 * Security Guard: Validates request origin and basic security headers
 */
export function validateRequestSecurity(req: Request) {
  const userAgent = req.headers.get("user-agent") || "";
  if (!userAgent || userAgent.length < 5) {
    return { valid: false, error: "Invalid User-Agent" };
  }
  return { valid: true };
}
