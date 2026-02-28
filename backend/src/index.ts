/**
 * PromptCraft Backend — Bun Entry Point
 * For local development with Bun runtime.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CONFIG } from './config';
import { requestId, securityHeaders, bodySizeLimit } from './middleware/security';
import { logger } from './middleware/logger';
import { aiRoutes } from './routes/ai';
import { transcribeRoutes } from './routes/transcribe';
import { healthRoutes } from './routes/health';

const app = new Hono();

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use('*', requestId);
app.use('*', logger);
app.use('*', securityHeaders);
app.use(
  '*',
  cors({
    credentials: true,
    origin: (origin) => {
      if (!origin) return '*';
      if (CONFIG.IS_DEV) return origin;
      if (CONFIG.ALLOWED_ORIGINS.includes(origin)) return origin;
      if (origin.startsWith('http://localhost:')) return origin;
      return null as unknown as string;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);
app.use('/api/*', bodySizeLimit(CONFIG.MAX_BODY_SIZE));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.route('/api/v1/health', healthRoutes);
app.route('/api/v1/ai', aiRoutes);
app.route('/api/v1/ai/transcribe', transcribeRoutes);

app.get('/', (c) => {
  return c.json({
    name: 'PromptCraft API',
    version: CONFIG.VERSION,
    docs: '/api/v1/health',
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.onError((err, c) => {
  const reqId = c.req.header('x-request-id') ?? '-';
  console.error(JSON.stringify({
    level: 'error', event: 'unhandled_error', requestId: reqId,
    message: err.message, stack: err.stack, timestamp: new Date().toISOString(),
  }));
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }, 500);
});

app.notFound((c) => {
  return c.json({ error: { code: 'NOT_FOUND', message: `Route ${c.req.method} ${c.req.path} not found` } }, 404);
});

// ─── Export ────────────────────────────────────────────────────────────────────
export default {
  fetch: app.fetch,
  port: CONFIG.PORT,
  hostname: '0.0.0.0',
};
