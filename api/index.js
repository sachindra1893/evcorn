export default async function handler(req, res) {
  try {
    const { reqHandler } = await import('../frontend/dist/evera-app/server/server.mjs');
    return reqHandler(req, res);
  } catch (err) {
    console.error('[Vercel SSR Handler Error]:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Server-Side Rendering Error');
  }
}
