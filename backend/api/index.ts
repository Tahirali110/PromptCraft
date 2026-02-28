/**
 * api/index.ts
 * Vercel Serverless Function entry point.
 * Self-contained: imports the Hono app and exports Vercel handler.
 */

// Re-export everything inline to avoid ESM module resolution issues
import { Hono } from 'hono';
// hono/vercel handle() removed — caused 504 on Node.js runtime (stream never resolves)
// Using direct Node.js handler bridge instead
import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

// ─── Config ────────────────────────────────────────────────────────────────────

const CONFIG = {
    VERSION: '1.0.0',
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
        .concat([
            'http://localhost:8081',
            'http://localhost:19006',
            'http://localhost:3000',
            'https://promptcraft.app',
        ]),
    IS_DEV: !process.env.VERCEL,
    RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 30),
    RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    MAX_BODY_SIZE: 2 * 1024 * 1024,
    PROVIDERS: {
        openai: 'https://api.openai.com/v1',
        openrouter: 'https://openrouter.ai/api/v1',
        anthropic: 'https://api.anthropic.com/v1',
        gemini: 'https://generativelanguage.googleapis.com',
    } as Record<string, string>,
    DEFAULT_MODELS: {
        openai: 'gpt-4o',
        openrouter: 'openai/gpt-oss-120b:free',
        anthropic: 'claude-3-5-sonnet-20241022',
        gemini: 'gemini-1.5-flash',
    } as Record<string, string>,
    DEFAULT_TEMPERATURE: 0.7,
    DEFAULT_MAX_TOKENS: 4096,
};

type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'openrouter';

// ─── Middleware ─────────────────────────────────────────────────────────────────

const requestId: MiddlewareHandler = async (c, next) => {
    const id = crypto.randomUUID();
    c.set('requestId', id);
    await next();
};

const securityHeaders: MiddlewareHandler = async (c, next) => {
    await next();
    const reqId = c.get('requestId') ?? crypto.randomUUID();
    c.header('X-Request-Id', reqId);
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
};

function bodySizeLimit(maxBytes: number): MiddlewareHandler {
    return async (c, next) => {
        const contentLength = c.req.header('content-length');
        if (contentLength && parseInt(contentLength, 10) > maxBytes) {
            return c.json({ error: { code: 'PAYLOAD_TOO_LARGE', message: `Body exceeds ${Math.round(maxBytes / 1024 / 1024)}MB` } }, 413);
        }
        await next();
    };
}

const loggerMw: MiddlewareHandler = async (c, next) => {
    const start = Date.now();
    console.log(JSON.stringify({ level: 'info', event: 'request', method: c.req.method, path: c.req.path, timestamp: new Date().toISOString() }));
    await next();
    console.log(JSON.stringify({ level: c.res.status >= 400 ? 'warn' : 'info', event: 'response', method: c.req.method, path: c.req.path, status: c.res.status, latencyMs: Date.now() - start }));
};

// ─── Rate limiter (in-memory, per cold start) ────────────────────────────────

const store = new Map<string, number[]>();

function rateLimiter(max = CONFIG.RATE_LIMIT_MAX, windowMs = CONFIG.RATE_LIMIT_WINDOW_MS): MiddlewareHandler {
    return async (c, next) => {
        const clientId = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
        const now = Date.now();
        let timestamps = store.get(clientId) ?? [];
        timestamps = timestamps.filter((t) => now - t < windowMs);
        if (timestamps.length >= max) {
            const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000);
            c.header('Retry-After', String(retryAfter));
            return c.json({ error: { code: 'RATE_LIMITED', message: `Too many requests. Try again in ${retryAfter}s.` } }, 429);
        }
        timestamps.push(now);
        store.set(clientId, timestamps);
        await next();
    };
}

// ─── Provider service ──────────────────────────────────────────────────────────

async function callProvider(opts: {
    provider: AIProvider; apiKey: string; systemPrompt: string; userMessage: string;
    history?: { role: 'user' | 'assistant'; content: string }[]; model?: string;
}): Promise<{ content: string; model: string }> {
    const { provider, apiKey, systemPrompt, userMessage, history = [] } = opts;
    const temperature = CONFIG.DEFAULT_TEMPERATURE;
    const maxTokens = CONFIG.DEFAULT_MAX_TOKENS;

    switch (provider) {
        case 'openai':
        case 'openrouter': {
            const baseUrl = CONFIG.PROVIDERS[provider];
            const model = provider === 'openrouter' ? (opts.model ?? CONFIG.DEFAULT_MODELS.openrouter) : CONFIG.DEFAULT_MODELS.openai;
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
            if (provider === 'openrouter') { headers['HTTP-Referer'] = 'https://promptcraft.app'; headers['X-Title'] = 'PromptCraft'; }
            const messages = [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userMessage }];
            const res = await fetch(`${baseUrl}/chat/completions`, { method: 'POST', headers, body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }) });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(`${provider} error: ${(err as any)?.error?.message ?? `HTTP ${res.status}`}`); }
            const data = (await res.json()) as any;
            return { content: data.choices?.[0]?.message?.content ?? '', model };
        }
        case 'gemini': {
            const model = CONFIG.DEFAULT_MODELS.gemini;
            const ai = new GoogleGenAI({ apiKey });
            const historyContents = history.map((m) => ({ role: m.role === 'user' ? ('user' as const) : ('model' as const), parts: [{ text: m.content }] }));
            const response = await ai.models.generateContent({
                model, contents: [{ role: 'user', parts: [{ text: systemPrompt }] }, ...historyContents, { role: 'user', parts: [{ text: userMessage }] }],
                config: { temperature },
            });
            return { content: response.text ?? '', model };
        }
        case 'anthropic': {
            const model = CONFIG.DEFAULT_MODELS.anthropic;
            const res = await fetch(`${CONFIG.PROVIDERS.anthropic}/messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages: [...history, { role: 'user', content: userMessage }] }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(`Anthropic error: ${(err as any)?.error?.message ?? `HTTP ${res.status}`}`); }
            const data = (await res.json()) as any;
            return { content: data.content?.[0]?.text ?? '', model };
        }
        default: throw new Error(`Unknown provider: ${provider}`);
    }
}

// ─── Validation schemas ────────────────────────────────────────────────────────

const chatSchema = z.object({
    provider: z.enum(['openai', 'gemini', 'anthropic', 'openrouter']),
    apiKey: z.string().min(1).max(500),
    systemPrompt: z.string().min(1).max(200_000),
    userMessage: z.string().min(1).max(50_000),
    history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional().default([]),
    model: z.string().optional(),
});

const transcribeSchema = z.object({
    provider: z.enum(['openai', 'gemini', 'anthropic', 'openrouter']),
    apiKey: z.string().min(1).max(500),
    audioBase64: z.string().min(1),
    mimeType: z.string().optional().default('audio/m4a'),
});

// ─── Build app ─────────────────────────────────────────────────────────────────

const app = new Hono();

app.use('*', requestId);
app.use('*', loggerMw);
app.use('*', securityHeaders);
app.use('*', cors({
    credentials: true,
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
}));
app.use('/api/*', bodySizeLimit(CONFIG.MAX_BODY_SIZE));

// Health
app.get('/api/v1/health', (c) => c.json({ status: 'ok', version: CONFIG.VERSION, timestamp: new Date().toISOString() }));

// AI Chat
app.post('/api/v1/ai/chat', rateLimiter(), zValidator('json', chatSchema), async (c) => {
    const body = c.req.valid('json');
    try {
        const result = await callProvider({ provider: body.provider, apiKey: body.apiKey, systemPrompt: body.systemPrompt, userMessage: body.userMessage, history: body.history, model: body.model });
        return c.json(result);
    } catch (err: any) {
        return c.json({ error: { code: 'PROVIDER_ERROR', message: err.message ?? 'AI provider error' } }, 502);
    }
});

// Transcribe
app.post('/api/v1/ai/transcribe', rateLimiter(), zValidator('json', transcribeSchema), async (c) => {
    const body = c.req.valid('json');
    try {
        const audioBuffer = Buffer.from(body.audioBase64, 'base64');
        const blob = new Blob([audioBuffer], { type: body.mimeType });
        const formData = new FormData();
        formData.append('file', blob, 'audio.m4a');
        formData.append('model', 'whisper-1');
        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${body.apiKey}` }, body: formData });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as any)?.error?.message ?? `HTTP ${res.status}`); }
        const data = (await res.json()) as any;
        return c.json({ text: data.text ?? '' });
    } catch (err: any) {
        return c.json({ error: { code: 'TRANSCRIPTION_ERROR', message: err.message ?? 'Transcription failed' } }, 502);
    }
});

// Root
app.get('/', (c) => c.json({ name: 'PromptCraft API', version: CONFIG.VERSION, docs: '/api/v1/health' }));

// Error & 404
app.onError((err, c) => {
    console.error(JSON.stringify({ level: 'error', event: 'unhandled_error', message: err.message, stack: err.stack }));
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }, 500);
});
app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: `Route ${c.req.method} ${c.req.path} not found` } }, 404));

// ─── Vercel Node.js Handler (direct bridge — fixes 504 timeout) ──────────────
const handler = async (req: any, res: any): Promise<void> => {
    try {
        // Build full URL
        const protocol = (req.headers['x-forwarded-proto'] as string) ?? 'https';
        const host = (req.headers['x-forwarded-host'] as string) ?? req.headers.host ?? 'localhost';
        const url = `${protocol}://${host}${req.url ?? '/'}`;

        // Copy headers
        const headers = new Headers();
        for (const [key, val] of Object.entries(req.headers as Record<string, string | string[]>)) {
            if (val !== undefined) {
                headers.set(key, Array.isArray(val) ? val.join(', ') : val);
            }
        }

        // Reconstruct body (Vercel body-parser already parsed it, so re-stringify)
        const method: string = req.method ?? 'GET';
        let body: string | undefined;
        if (!['GET', 'HEAD'].includes(method) && req.body !== undefined) {
            body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        // Create Web API Request and run through Hono
        const request = new Request(url, { method, headers, body });
        const response = await app.fetch(request);

        // Write response back to Vercel
        res.status(response.status);
        response.headers.forEach((value: string, key: string) => res.setHeader(key, value));
        const text = await response.text();
        res.end(text);
    } catch (err: any) {
        console.error(JSON.stringify({ level: 'error', event: 'handler_error', message: err.message }));
        res.status(500).end(JSON.stringify({ error: { code: 'HANDLER_ERROR', message: 'Internal server error' } }));
    }
};

export default handler;
module.exports = handler;
