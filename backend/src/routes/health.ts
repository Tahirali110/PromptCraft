/**
 * Health check route.
 * GET /api/v1/health
 */
import { Hono } from 'hono';
import { CONFIG } from '../config';

const health = new Hono();

const startTime = Date.now();

health.get('/', (c) => {
    return c.json({
        status: 'ok',
        version: CONFIG.VERSION,
        uptime: Math.round((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString(),
    });
});

export { health as healthRoutes };
