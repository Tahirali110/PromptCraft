/**
 * lib/orchestrator.ts
 * Multi-provider prompt chaining engine.
 * All AI calls are proxied through the PromptCraft backend for security.
 * Supports phase-level retry: pass `completedSteps` to resume from a failed step.
 */
import Constants from 'expo-constants';
import { RESEARCH_PROMPT, PRD_PROMPT, TECH_DESIGN_PROMPT, AGENT_PROMPT } from './promptTemplates';

export type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'openrouter';

export interface StepResult {
  step: number;
  label: string;
  content: string;
}

export interface OrchestrationResult {
  idea: string;
  provider: AIProvider;
  timestamp: number;
  steps: StepResult[];
}

export type ProgressCallback = (step: number, label: string) => void;

// ─── Backend URL ──────────────────────────────────────────────────────────────

const BACKEND_URL = (
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ??
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  'http://localhost:3002'
).replace(/\/$/, '');

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  timeoutMs = 120_000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);

      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
        return res;
      }

      // Retry on 429 or 5xx
      if (attempt < retries) {
        const delay = res.status === 429
          ? Math.min(parseInt(res.headers.get('Retry-After') ?? '5', 10) * 1000, 30_000)
          : Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      if (attempt < retries && (err.name === 'AbortError' || err.message?.includes('fetch'))) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Request failed after retries');
}

// ─── Provider API call (via backend proxy) ───────────────────────────────────

export async function callProvider(
  provider: AIProvider,
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[] = [],
  orModel?: string
): Promise<string> {
  const res = await fetchWithRetry(`${BACKEND_URL}/api/v1/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      apiKey,
      systemPrompt,
      userMessage,
      history,
      model: orModel,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as any)?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json() as any;
  return data.content ?? '';
}

// ─── Voice transcription (via backend proxy) ─────────────────────────────────

export async function transcribeAudio(
  provider: AIProvider,
  apiKey: string,
  audioUri: string
): Promise<string> {
  // Read audio file and convert to base64
  const audioResp = await fetch(audioUri);
  const audioBlob = await audioResp.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  const res = await fetchWithRetry(`${BACKEND_URL}/api/v1/ai/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      apiKey,
      audioBase64: base64,
      mimeType: 'audio/m4a',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as any)?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json() as any;
  return (data.text ?? '').trim();
}

// ─── Step config ──────────────────────────────────────────────────────────────

export const STEP_CONFIGS = [
  {
    label: 'Market Research',
    systemPrompt: RESEARCH_PROMPT,
    getUserMessage: (idea: string) =>
      `Generate a comprehensive market research document for the following app idea:\n\n${idea}`,
    getPrevContext: (_prev: string) => '',
  },
  {
    label: 'Product Requirements',
    systemPrompt: PRD_PROMPT,
    getUserMessage: (_idea: string) => '',
    getPrevContext: (prev: string) =>
      `Based on this market research, create a detailed PRD:\n\n${prev}`,
  },
  {
    label: 'Technical Design',
    systemPrompt: TECH_DESIGN_PROMPT,
    getUserMessage: (_idea: string) => '',
    getPrevContext: (prev: string) =>
      `Based on this PRD, create a comprehensive Technical Design Document:\n\n${prev}`,
  },
  {
    label: 'Agent Orchestration Prompt',
    systemPrompt: AGENT_PROMPT,
    getUserMessage: (_idea: string) => '',
    getPrevContext: (prev: string) =>
      `Based on this Technical Design Document, create the final AI coding agent orchestration prompt:\n\n${prev}`,
  },
];

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export interface RunOrchestrationOptions {
  idea: string;
  provider: AIProvider;
  apiKey: string;
  onProgress: ProgressCallback;
  orModel?: string;
  /** Already-completed steps to resume from — pass when retrying a failed phase */
  existingSteps?: StepResult[];
  /** Called after each step completes, so caller can persist progress */
  onStepComplete?: (step: StepResult, allSteps: StepResult[]) => void;
}

export async function runOrchestration(
  ideaOrOptions: string | RunOrchestrationOptions,
  providerArg?: AIProvider,
  apiKeyArg?: string,
  onProgressArg?: ProgressCallback,
  orModelArg?: string
): Promise<OrchestrationResult> {
  // Support both old call signature and new options object
  let opts: RunOrchestrationOptions;
  if (typeof ideaOrOptions === 'string') {
    opts = {
      idea: ideaOrOptions,
      provider: providerArg!,
      apiKey: apiKeyArg!,
      onProgress: onProgressArg!,
      orModel: orModelArg,
    };
  } else {
    opts = ideaOrOptions;
  }

  const { idea, provider, apiKey, onProgress, orModel, existingSteps = [], onStepComplete } = opts;

  const steps: StepResult[] = [...existingSteps];
  const startIndex = steps.length; // resume from failed step

  // The "previous content" for step N is the content of step N-1
  let prevContent = steps.length > 0 ? steps[steps.length - 1].content : '';

  for (let i = startIndex; i < STEP_CONFIGS.length; i++) {
    const config = STEP_CONFIGS[i];
    onProgress(i + 1, config.label);

    const userMessage =
      i === 0
        ? config.getUserMessage(idea)
        : config.getPrevContext(prevContent);

    const content = await callProvider(
      provider,
      apiKey,
      config.systemPrompt,
      userMessage,
      [],
      orModel
    );

    const stepResult: StepResult = { step: i + 1, label: config.label, content };
    steps.push(stepResult);
    prevContent = content;

    // Notify caller so they can persist the completed step
    onStepComplete?.(stepResult, [...steps]);
  }

  return {
    idea,
    provider,
    timestamp: Date.now(),
    steps,
  };
}
