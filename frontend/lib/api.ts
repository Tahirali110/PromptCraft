/**
 * API Configuration
 *
 * The backend URL is automatically configured:
 * - In development: Read from EXPO_PUBLIC_BACKEND_URL (set by ngrok script)
 * - In production: Use your deployed API URL
 */

// Get the backend URL from environment variables
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3002';

/**
 * Simple fetch wrapper for API calls
 */
export async function apiRequest<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BACKEND_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Example usage:
 *
 * import { apiRequest } from '@/lib/api';
 *
 * const data = await apiRequest('/users');
 */

export { BACKEND_URL };
