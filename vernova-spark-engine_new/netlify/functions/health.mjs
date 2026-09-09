/**
 * Netlify production health — same path as FastAPI GET /api/v1/health.
 * Confirms databank API surface is live (series proxied to static crops).
 */
export async function handler() {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      ok: true,
      mode: 'netlify-static',
      series: '/api/v1/series/{cfg}/{event}?phase=pre|post|full',
    }),
  };
}
