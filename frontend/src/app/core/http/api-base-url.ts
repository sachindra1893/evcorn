/**
 * Single source of truth for the backend API origin. Extracted from
 * BlogDataService so every new reliability service (logging beacon, etc.)
 * resolves the same backend host instead of re-deriving it independently.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000/api';
  }
  const host = window.location.hostname;
  const isLocal = host === 'localhost' ||
                   host === '127.0.0.1' ||
                   host.startsWith('10.') ||
                   host.startsWith('192.') ||
                   host.startsWith('172.');
  return isLocal
    ? `http://${host}:3000/api`
    : 'https://evcorn-backend.onrender.com/api';
}
