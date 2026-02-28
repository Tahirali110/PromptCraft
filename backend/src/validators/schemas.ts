/**
 * Zod validation schemas for all API inputs.
 */
import { z } from 'zod';

// ─── Shared ───────────────────────────────────────────────────────────────────

const providerSchema = z.enum(['openai', 'gemini', 'anthropic', 'openrouter']);

const apiKeySchema = z
    .string()
    .min(10, 'API key is too short')
    .max(256, 'API key is too long')
    .refine((k) => !k.includes(' '), 'API key must not contain spaces');

// ─── Chat ─────────────────────────────────────────────────────────────────────

const messageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(100_000),
});

export const chatRequestSchema = z.object({
    provider: providerSchema,
    apiKey: apiKeySchema,
    systemPrompt: z.string().min(1).max(200_000),
    userMessage: z.string().min(1).max(100_000),
    history: z.array(messageSchema).max(100).optional().default([]),
    model: z.string().max(100).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(32_768).optional(),
});

export type ValidatedChatRequest = z.infer<typeof chatRequestSchema>;

// ─── Transcription ────────────────────────────────────────────────────────────

export const transcribeRequestSchema = z.object({
    provider: providerSchema,
    apiKey: apiKeySchema,
    audioBase64: z
        .string()
        .min(100, 'Audio data is too short')
        .max(5_000_000, 'Audio data exceeds 5MB limit'),
    mimeType: z.string().max(50).optional().default('audio/m4a'),
});

export type ValidatedTranscribeRequest = z.infer<typeof transcribeRequestSchema>;
