/**
 * PromptCraft Backend — Main Entry Point
 * Hono server with security middleware, rate limiting, and AI proxy routes.
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

// 1. Request ID (must be first for tracing)
app.use('*', requestId);

// 2. Structured logging
app.use('*', logger);

// 3. Security headers
app.use('*', securityHeaders);

// 4. CORS — only allow specific origins
app.use(
  '*',
  cors({
    credentials: true,
    origin: (origin) => {
      if (!origin) return '*';
      // In dev mode, allow all origins (mobile on same WiFi)
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

// 5. Body size limit (2MB — for audio uploads)
app.use('/api/*', bodySizeLimit(CONFIG.MAX_BODY_SIZE));

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check (no rate limiting)
app.route('/api/v1/health', healthRoutes);

// AI chat proxy
app.route('/api/v1/ai', aiRoutes);

// Audio transcription proxy
app.route('/api/v1/ai/transcribe', transcribeRoutes);

// Root
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
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'unhandled_error',
      requestId: reqId,
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    })
  );

  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `Route ${c.req.method} ${c.req.path} not found`,
      },
    },
    404
  );
});

// ─── Export ────────────────────────────────────────────────────────────────────

export default {
  fetch: app.fetch,
  port: CONFIG.PORT,
  hostname: '0.0.0.0',
};
