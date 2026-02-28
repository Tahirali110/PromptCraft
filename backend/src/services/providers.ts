/**
 * Multi-provider AI service.
 * Handles chat completions for OpenAI, Gemini, Anthropic, OpenRouter.
 */
import { GoogleGenAI } from '@google/genai';
import { CONFIG } from '../config';
import type { AIProvider } from '../types';

interface ProviderCallOptions {
    provider: AIProvider;
    apiKey: string;
    systemPrompt: string;
    userMessage: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export async function callProvider(opts: ProviderCallOptions): Promise<{
    content: string;
    model: string;
}> {
    const {
        provider,
        apiKey,
        systemPrompt,
        userMessage,
        history = [],
        temperature = CONFIG.DEFAULT_TEMPERATURE,
        maxTokens = CONFIG.DEFAULT_MAX_TOKENS,
    } = opts;

    switch (provider) {
        // ── OpenAI / OpenRouter ───────────────────────────────────────────────────
        case 'openai':
        case 'openrouter': {
            const baseUrl = CONFIG.PROVIDERS[provider];
            const model =
                provider === 'openrouter'
                    ? (opts.model ?? CONFIG.DEFAULT_MODELS.openrouter)
                    : CONFIG.DEFAULT_MODELS.openai;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            };

            if (provider === 'openrouter') {
                headers['HTTP-Referer'] = 'https://promptcraft.app';
                headers['X-Title'] = 'PromptCraft';
            }

            const messages = [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: userMessage },
            ];

            const res = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const msg = (err as any)?.error?.message ?? `HTTP ${res.status}`;
                throw new Error(`${provider === 'openrouter' ? 'OpenRouter' : 'OpenAI'} error: ${msg}`);
            }

            const data = (await res.json()) as any;
            return {
                content: data.choices?.[0]?.message?.content ?? '',
                model,
            };
        }

        // ── Google Gemini ─────────────────────────────────────────────────────────
        case 'gemini': {
            const model = CONFIG.DEFAULT_MODELS.gemini;
            const ai = new GoogleGenAI({ apiKey });

            const historyContents = history.map((m) => ({
                role: m.role === 'user' ? ('user' as const) : ('model' as const),
                parts: [{ text: m.content }],
            }));

            const response = await ai.models.generateContent({
                model,
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    ...historyContents,
                    { role: 'user', parts: [{ text: userMessage }] },
                ],
                config: { temperature },
            });

            return {
                content: response.text ?? '',
                model,
            };
        }

        // ── Anthropic Claude ──────────────────────────────────────────────────────
        case 'anthropic': {
            const model = CONFIG.DEFAULT_MODELS.anthropic;

            const res = await fetch(`${CONFIG.PROVIDERS.anthropic}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model,
                    max_tokens: maxTokens,
                    system: systemPrompt,
                    messages: [...history, { role: 'user', content: userMessage }],
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const msg = (err as any)?.error?.message ?? `HTTP ${res.status}`;
                throw new Error(`Anthropic error: ${msg}`);
            }

            const data = (await res.json()) as any;
            return {
                content: data.content?.[0]?.text ?? '',
                model,
            };
        }

        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}
