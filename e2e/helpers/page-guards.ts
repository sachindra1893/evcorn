import { expect, Page, ConsoleMessage } from '@playwright/test';

const IGNORED_CONSOLE =
  /Download the React DevTools|Angular is running in development|\[vite\]|favicon\.ico|gtag|googletagmanager|Failed to load resource: net::ERR_|CORS policy|Access-Control-Allow-Origin|status of 404|cloudinary|\/assets\/|hero-bg|\/api\/analytics\/event|eventType: http_failure/i;

export function attachConsoleErrorCollector(page: Page): { errors: string[] } {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (IGNORED_CONSOLE.test(text)) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return { errors };
}

/** Wait until primary content is visible and loading overlays are gone. */
export async function waitForSettledContent(page: Page, contentSelector: string) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator(contentSelector).first()).toBeVisible({ timeout: 30_000 });

  // Guard against infinite loaders (Phase 1 regression).
  // Exclude tiny inline spinners inside buttons (e.g. compare tray) — page overlays only.
  const loaders = page.locator(
    '.loading-overlay:visible, .state-panel .spinner:visible, [aria-busy="true"]:visible'
  );
  const count = await loaders.count();
  if (count > 0) {
    await expect(loaders.first()).toBeHidden({ timeout: 25_000 });
  }
}

export async function expectNoBlankScreen(page: Page) {
  const bodyText = (await page.locator('body').innerText()).trim();
  expect(bodyText.length).toBeGreaterThan(20);
  const root = page.locator('app-root, body');
  await expect(root.first()).toBeVisible();
}

export async function expectHttpOk(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, `navigation to ${path}`).not.toBeNull();
  expect(response!.status(), `${path} HTTP status`).toBeLessThan(400);
  return response!;
}
