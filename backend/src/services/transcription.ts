/**
 * Audio transcription service.
 * Supports OpenAI Whisper and Gemini multimodal audio.
 */
import { GoogleGenAI } from '@google/genai';
import type { AIProvider } from '../types';

interface TranscribeOptions {
    provider: AIProvider;
    apiKey: string;
    audioBase64: string;
    mimeType: string;
}

export async function transcribeAudio(opts: TranscribeOptions): Promise<string> {
    const { provider, apiKey, audioBase64, mimeType } = opts;

    switch (provider) {
        // ── OpenAI Whisper / OpenRouter ────────────────────────────────────────────
        case 'openai':
        case 'openrouter': {
            // Convert base64 to a Blob for FormData
            const binaryStr = atob(audioBase64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: mimeType });

            const formData = new FormData();
            formData.append('file', blob, 'voice.m4a');
            formData.append('model', 'whisper-1');

            const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}` },
                body: formData,
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(`Whisper error: ${(err as any)?.error?.message ?? resp.status}`);
            }

            const data = (await resp.json()) as any;
            return (data.text ?? '').trim();
        }

        // ── Gemini multimodal audio ───────────────────────────────────────────────
        case 'gemini': {
            const ai = new GoogleGenAI({ apiKey });

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { inlineData: { mimeType, data: audioBase64 } },
                            {
                                text: 'Transcribe this audio accurately. Return ONLY the transcribed text, nothing else. No quotes, no labels, no preamble.',
                            },
                        ],
                    },
                ],
            });

            return (response.text ?? '').trim();
        }

        // ── Anthropic (not supported) ─────────────────────────────────────────────
        case 'anthropic':
            throw new Error(
                'Anthropic does not support audio transcription. Please switch to Gemini or OpenAI.'
            );

        default:
            throw new Error(`Transcription not supported for provider: ${provider}`);
    }
}
