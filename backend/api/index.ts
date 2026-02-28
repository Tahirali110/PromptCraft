/**
 * api/index.ts
 * Vercel Serverless Function entry point.
 * Wraps the Hono app with Vercel's request handler.
 */
import { handle } from 'hono/vercel';
import app from '../src/app';

export default handle(app);
