/**
 * AI chat proxy route.
 * POST /api/v1/ai/chat
 */
import { Hono } from 'hono';
import { chatRequestSchema } from '../validators/schemas';
import { callProvider } from '../services/providers';
import { rateLimiter } from '../middleware/rateLimiter';

const ai = new Hono();

// Rate limit: 30 requests per minute for AI calls
ai.use('*', rateLimiter(30, 60_000));

/**
 * POST /api/v1/ai/chat
 * Proxies AI chat completion requests to the selected provider.
 */
ai.post('/chat', async (c) => {
    const rawBody = await c.req.json();
    const parsed = chatRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
        return c.json(
            {
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request body',
                    details: parsed.error.flatten().fieldErrors,
                },
            },
            400
        );
    }

    const body = parsed.data;
    const start = Date.now();

    try {
        const result = await callProvider({
            provider: body.provider,
            apiKey: body.apiKey,
            systemPrompt: body.systemPrompt,
            userMessage: body.userMessage,
            history: body.history,
            model: body.model,
            temperature: body.temperature,
            maxTokens: body.maxTokens,
        });

        return c.json({
            content: result.content,
            provider: body.provider,
            model: result.model,
            latencyMs: Date.now() - start,
        });
    } catch (err: any) {
        const status = err.message?.includes('401') || err.message?.includes('Unauthorized') ? 401 : 502;
        return c.json(
            {
                error: {
                    code: status === 401 ? 'AUTH_ERROR' : 'PROVIDER_ERROR',
                    message: err.message ?? 'AI provider request failed',
                },
            },
            status
        );
    }
});

export { ai as aiRoutes };
