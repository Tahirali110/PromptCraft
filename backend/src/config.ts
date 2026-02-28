/**
 * Backend configuration — environment variables & constants.
 */

export const CONFIG = {
    /** App version */
    VERSION: '1.0.0',

    /** Server port (local dev) */
    PORT: Number(process.env.PORT ?? 3002),

    /** Allowed CORS origins */
    ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
        .concat([
            'http://localhost:8081',     // Expo dev
            'http://localhost:19006',    // Expo web
            'http://localhost:3000',     // Local web
            'https://promptcraft.app',  // Production
        ]),

    /** In development, allow all origins (mobile device on same network) */
    IS_DEV: !process.env.VERCEL,

    /** Rate limit: max requests per window */
    RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 30),

    /** Rate limit: window in milliseconds (1 minute) */
    RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),

    /** Max request body size in bytes (2MB for audio) */
    MAX_BODY_SIZE: 2 * 1024 * 1024,

    /** AI provider endpoints */
    PROVIDERS: {
        openai: 'https://api.openai.com/v1',
        openrouter: 'https://openrouter.ai/api/v1',
        anthropic: 'https://api.anthropic.com/v1',
        gemini: 'https://generativelanguage.googleapis.com',
    },

    /** Default models per provider */
    DEFAULT_MODELS: {
        openai: 'gpt-4o',
        openrouter: 'openai/gpt-4o',
        anthropic: 'claude-3-5-sonnet-20241022',
        gemini: 'gemini-1.5-flash',
    },

    /** Default generation params */
    DEFAULT_TEMPERATURE: 0.7,
    DEFAULT_MAX_TOKENS: 4096,
} as const;
