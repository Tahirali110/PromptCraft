/**
 * Audio transcription proxy route.
 * POST /api/v1/ai/transcribe
 */
import { Hono } from 'hono';
import { transcribeRequestSchema } from '../validators/schemas';
import { transcribeAudio } from '../services/transcription';
import { rateLimiter } from '../middleware/rateLimiter';

const transcribe = new Hono();

// Rate limit: 15 transcription requests per minute
transcribe.use('*', rateLimiter(15, 60_000));

/**
 * POST /api/v1/ai/transcribe
 * Proxies audio transcription to the selected provider.
 */
transcribe.post('/', async (c) => {
    const rawBody = await c.req.json();
    const parsed = transcribeRequestSchema.safeParse(rawBody);

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
        const text = await transcribeAudio({
            provider: body.provider,
            apiKey: body.apiKey,
            audioBase64: body.audioBase64,
            mimeType: body.mimeType,
        });

        return c.json({
            text,
            provider: body.provider,
            latencyMs: Date.now() - start,
        });
    } catch (err: any) {
        const status = err.message?.includes('not support') ? 400 : 502;
        return c.json(
            {
                error: {
                    code: status === 400 ? 'UNSUPPORTED' : 'PROVIDER_ERROR',
                    message: err.message ?? 'Transcription failed',
                },
            },
            status
        );
    }
});

export { transcribe as transcribeRoutes };
