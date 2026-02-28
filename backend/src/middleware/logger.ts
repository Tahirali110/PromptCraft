/**
 * Structured request/response logger middleware.
 */
import type { MiddlewareHandler } from 'hono';

export const logger: MiddlewareHandler = async (c, next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    const requestId = c.req.header('x-request-id') ?? '-';

    console.log(
        JSON.stringify({
            level: 'info',
            event: 'request',
            requestId,
            method,
            path,
            timestamp: new Date().toISOString(),
        })
    );

    await next();

    const latency = Date.now() - start;
    const status = c.res.status;

    console.log(
        JSON.stringify({
            level: status >= 400 ? 'warn' : 'info',
            event: 'response',
            requestId,
            method,
            path,
            status,
            latencyMs: latency,
            timestamp: new Date().toISOString(),
        })
    );
};
