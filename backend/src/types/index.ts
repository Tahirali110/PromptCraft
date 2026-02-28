/**
 * Shared TypeScript types for PromptCraft backend.
 */

// ─── AI Providers ─────────────────────────────────────────────────────────────

export type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'openrouter';

// ─── Request / Response ───────────────────────────────────────────────────────

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatRequest {
    provider: AIProvider;
    apiKey: string;
    systemPrompt: string;
    userMessage: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
    model?: string;            // OpenRouter model override
    temperature?: number;
    maxTokens?: number;
}

export interface ChatResponse {
    content: string;
    provider: AIProvider;
    model: string;
    latencyMs: number;
}

export interface TranscribeRequest {
    provider: AIProvider;
    apiKey: string;
    audioBase64: string;       // base64-encoded audio data
    mimeType?: string;         // e.g. 'audio/m4a', default: 'audio/m4a'
}

export interface TranscribeResponse {
    text: string;
    provider: AIProvider;
    latencyMs: number;
}

export interface HealthResponse {
    status: 'ok';
    version: string;
    uptime: number;
    timestamp: string;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}

// ─── Internal ─────────────────────────────────────────────────────────────────

export interface RequestMeta {
    requestId: string;
    startTime: number;
    ip: string;
}
