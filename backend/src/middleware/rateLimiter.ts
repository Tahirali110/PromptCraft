/**
 * In-memory sliding-window rate limiter.
 * No Redis needed — works on Vercel Edge / serverless.
 */
import type { MiddlewareHandler } from 'hono';
import { CONFIG } from '../config';

interface WindowEntry {
    timestamps: number[];
}

const store = new Map<string, WindowEntry>();

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        entry.timestamps = entry.timestamps.filter(
            (t) => now - t < CONFIG.RATE_LIMIT_WINDOW_MS
        );
        if (entry.timestamps.length === 0) store.delete(key);
    }
}, 5 * 60_000);

/**
 * Extracts a client identifier for rate limiting.
 */
function getClientId(c: { req: { header: (name: string) => string | undefined } }): string {
    return (
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
        c.req.header('x-real-ip') ??
        'unknown'
    );
}

/**
 * Rate limiting middleware with sliding window algorithm.
 */
export function rateLimiter(
    maxRequests: number = CONFIG.RATE_LIMIT_MAX,
    windowMs: number = CONFIG.RATE_LIMIT_WINDOW_MS
): MiddlewareHandler {
    return async (c, next) => {
        const clientId = getClientId(c);
        const now = Date.now();

        let entry = store.get(clientId);
        if (!entry) {
            entry = { timestamps: [] };
            store.set(clientId, entry);
        }

        // Remove timestamps outside the current window
        entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

        if (entry.timestamps.length >= maxRequests) {
            const retryAfter = Math.ceil(
                (entry.timestamps[0] + windowMs - now) / 1000
            );

            c.header('Retry-After', String(retryAfter));
            c.header('X-RateLimit-Limit', String(maxRequests));
            c.header('X-RateLimit-Remaining', '0');
            c.header('X-RateLimit-Reset', String(Math.ceil((entry.timestamps[0] + windowMs) / 1000)));

            return c.json(
                {
                    error: {
                        code: 'RATE_LIMITED',
                        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
                    },
                },
                429
            );
        }

        entry.timestamps.push(now);

        // Add rate limit headers
        c.header('X-RateLimit-Limit', String(maxRequests));
        c.header('X-RateLimit-Remaining', String(maxRequests - entry.timestamps.length));

        await next();
    };
}
