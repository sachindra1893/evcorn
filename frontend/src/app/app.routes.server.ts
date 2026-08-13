import { RenderMode, ServerRoute } from '@angular/ssr';

const API_BASE_URL = 'https://evcorn-backend.onrender.com/api';

/**
 * Helper to fetch API endpoints at build time with timeout and safe fallback.
 */
async function fetchPrerenderJson<T>(endpoint: string): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for Render cold starts

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      console.warn(`[Prerender] API ${endpoint} returned status ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[Prerender] Failed to fetch ${endpoint} at build time:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export const serverRoutes: ServerRoute[] = [
  // Full Server Rendering (SSR on demand per request)
  {
    path: '',
    renderMode: RenderMode.Server
  },
  {
    path: 'home',
    renderMode: RenderMode.Server
  },
  {
    path: 'compare',
    renderMode: RenderMode.Server
  },
  {
    path: 'energy',
    renderMode: RenderMode.Server
  },
  {
    path: 'search',
    renderMode: RenderMode.Server
  },

  // Prerendered Parameterized Routes (Generated at build time)
  {
    path: 'articles/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const articles = await fetchPrerenderJson<Array<{ id: string }>>('/articles?light=true');
      if (!articles || !Array.isArray(articles)) {
        console.warn('[Prerender] No article IDs fetched for articles/:id route.');
        return [];
      }
      const params = articles
        .filter(a => a && typeof a.id === 'string' && a.id.trim().length > 0)
        .map(a => ({ id: a.id }));
      console.log(`[Prerender] Resolved ${params.length} article pages for prerendering.`);
      return params;
    }
  },
  {
    path: 'ev/:brandSlug/:modelSlug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const vehicles = await fetchPrerenderJson<Array<{ brandSlug?: string; modelSlug?: string; id?: string }>>('/vehicles?status=Launched');
      if (!vehicles || !Array.isArray(vehicles)) {
        console.warn('[Prerender] No vehicles fetched for ev/:brandSlug/:modelSlug route.');
        return [];
      }
      const params = vehicles
        .filter(v => v && v.brandSlug && (v.modelSlug || v.id))
        .map(v => ({
          brandSlug: String(v.brandSlug),
          modelSlug: String(v.modelSlug || v.id)
        }));
      console.log(`[Prerender] Resolved ${params.length} vehicle spec pages for prerendering.`);
      return params;
    }
  },

  // Static Pages (Prerendered at build time by default)
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
