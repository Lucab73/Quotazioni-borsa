/**
 * BORSA LIVE — Cloudflare Worker proxy
 * Deploy gratuito su https://workers.cloudflare.com
 * 100.000 richieste/giorno gratis, nessuna carta di credito
 */
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const sym = url.searchParams.get('s');
    if (!sym) return new Response('Missing ?s=SYMBOL', { status: 400 });

    const yfUrl =
      'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(sym) +
      '?interval=5m&range=1d&includePrePost=false';

    const resp = await fetch(yfUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com',
      },
    });

    const body = await resp.text();
    return new Response(body, {
      status: resp.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',       // CORS aperto
        'Cache-Control': 'public, max-age=60',    // cache 60s
      },
    });
  },
};
