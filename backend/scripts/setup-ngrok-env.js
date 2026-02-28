#!/usr/bin/env node

/**
 * This script polls the ngrok API to get the tunnel URL
 * and writes it to the frontend's .env.local file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getNgrokUrl() {
  try {
    const response = await fetch('http://localhost:4040/api/tunnels');
    const data = await response.json();
    const httpsTunnel = data.tunnels?.find((t) => t.proto === 'https');
    return httpsTunnel?.public_url || null;
  } catch (error) {
    return null;
  }
}

async function writeBackendUrlToEnv(url) {
  try {
    const envPath = path.join(__dirname, '../../frontend/.env.local');
    const envContent = `EXPO_PUBLIC_BACKEND_URL=${url}\n`;
    fs.writeFileSync(envPath, envContent, 'utf-8');
    console.log(`✅ Backend URL written to .env.local: ${url}`);
  } catch (error) {
    console.error('Failed to write env file:', error);
  }
}

async function waitForNgrok(maxRetries = 15, delayMs = 2000) {
  console.log('🔍 Waiting for ngrok tunnel...');

  for (let i = 0; i < maxRetries; i++) {
    const ngrokUrl = await getNgrokUrl();

    if (ngrokUrl) {
      await writeBackendUrlToEnv(ngrokUrl);
      console.log(`🌐 Backend accessible at: ${ngrokUrl}`);
      console.log('✅ Ready to start frontend!');
      return;
    }

    if (i < maxRetries - 1) {
      console.log(`   Retrying... (${i + 1}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Fallback
  const fallbackUrl = 'http://localhost:3002';
  await writeBackendUrlToEnv(fallbackUrl);
  console.log(`⚠️  Ngrok not detected, using: ${fallbackUrl}`);
  console.log('✅ Ready to start frontend!');
}

waitForNgrok();
