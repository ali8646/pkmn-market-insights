import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;

export const authClient = authUrl
  ? createAuthClient(authUrl, { adapter: BetterAuthReactAdapter() })
  : null;

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  if (authClient) {
    try {
      const tokenResult = await authClient.token();
      if (!tokenResult.error && tokenResult.data?.token) {
        headers.set('Authorization', `Bearer ${tokenResult.data.token}`);
      }
    } catch {
      // Public market requests do not require an active auth session.
    }
  }

  return fetch(input, { ...init, headers });
}
