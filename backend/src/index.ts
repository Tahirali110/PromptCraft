/**
 * PromptCraft Backend — Bun Entry Point
 * For local development with Bun runtime.
 */
import app from './app';
import { CONFIG } from './config';

export default {
  fetch: app.fetch,
  port: CONFIG.PORT,
  hostname: '0.0.0.0',
};
