/**
 * Security middleware — headers, request sanitization, body size limit.
 */
import type { MiddlewareHandler } from 'hono';

/**
 * Adds standard security headers to every response.
 */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
    await next();

    // Unique request ID for tracing (set by requestId middleware)
    const reqId = c.req.header('x-request-id') ?? crypto.randomUUID();
    c.header('X-Request-Id', reqId);

    // Security headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    c.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
    );
    c.header(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none'"
    );

    // Remove powered-by header
    c.header('X-Powered-By', '');
};

/**
 * Injects a unique request ID into the request headers for tracing.
 */
export const requestId: MiddlewareHandler = async (c, next) => {
    const id = crypto.randomUUID();
    c.req.raw.headers.set('x-request-id', id);
    await next();
};

/**
 * Validates request body size doesn't exceed limit.
 */
export function bodySizeLimit(maxBytes: number): MiddlewareHandler {
    return async (c, next) => {
        const contentLength = c.req.header('content-length');
        if (contentLength && parseInt(contentLength, 10) > maxBytes) {
            return c.json(
                {
                    error: {
                        code: 'PAYLOAD_TOO_LARGE',
                        message: `Request body exceeds ${Math.round(maxBytes / 1024 / 1024)}MB limit`,
                    },
                },
                413
            );
        }
        await next();
    };
}
