/**
 * BORSA LIVE — Cloudflare Worker v2
 * Endpoints:
 *   GET  ?s=ENI.MI           → quotazione
 *   GET  ?q=ferrari           → ricerca
 *   GET  ?action=load&id=XXX  → carica portafoglio
 *   POST ?action=save         → salva portafoglio  { id, name, pin, tickers }
 *   GET  ?action=list&pin=XXX&id=XXX → lista portafogli con stesso pin
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const CORS = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
    }

    const YF_HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://finance.yahoo.com',
    };

    const action = url.searchParams.get('action');

    // ── SALVA PORTAFOGLIO ──
    if (action === 'save' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { id, name, pin, tickers } = body;
        if (!id || !name || !pin || !Array.isArray(tickers)) {
          return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: CORS });
        }
        // Valida PIN (4-8 cifre)
        if (!/^\d{4,8}$/.test(pin)) {
          return new Response(JSON.stringify({ error: 'PIN deve essere 4-8 cifre' }), { status: 400, headers: CORS });
        }
        const data = { id, name, pin, tickers, updatedAt: new Date().toISOString() };
        await env.KV.put('portfolio:' + id, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 365 }); // 1 anno
        return new Response(JSON.stringify({ ok: true, id }), { headers: CORS });
      } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
      }
    }

    // ── CARICA PORTAFOGLIO ──
    if (action === 'load') {
      const id = url.searchParams.get('id');
      const pin = url.searchParams.get('pin');
      if (!id || !pin) return new Response(JSON.stringify({ error: 'Missing id or pin' }), { status: 400, headers: CORS });
      const raw = await env.KV.get('portfolio:' + id);
      if (!raw) return new Response(JSON.stringify({ error: 'Portafoglio non trovato' }), { status: 404, headers: CORS });
      const data = JSON.parse(raw);
      if (data.pin !== pin) return new Response(JSON.stringify({ error: 'PIN errato' }), { status: 401, headers: CORS });
      return new Response(JSON.stringify({ ok: true, portfolio: { id: data.id, name: data.name, tickers: data.tickers, updatedAt: data.updatedAt } }), { headers: CORS });
    }

    // ── LISTA PORTAFOGLI PER PIN ──
    if (action === 'list') {
      const pin = url.searchParams.get('pin');
      if (!pin) return new Response(JSON.stringify({ error: 'Missing pin' }), { status: 400, headers: CORS });
      // Cerca tutti i portafogli con questo PIN
      const list = await env.KV.list({ prefix: 'portfolio:' });
      const results = [];
      for (const key of list.keys) {
        const raw = await env.KV.get(key.name);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.pin === pin) {
            results.push({ id: data.id, name: data.name, tickers: data.tickers, updatedAt: data.updatedAt });
          }
        }
      }
      return new Response(JSON.stringify({ ok: true, portfolios: results }), { headers: CORS });
    }

    // ── RICERCA ──
    const q = url.searchParams.get('q');
    if (q) {
      const searchUrl = 'https://query1.finance.yahoo.com/v1/finance/search?q=' +
        encodeURIComponent(q) + '&quotesCount=10&newsCount=0&enableFuzzyQuery=true';
      const resp = await fetch(searchUrl, { headers: YF_HEADERS });
      const body = await resp.text();
      return new Response(body, { status: resp.status, headers: { ...CORS, 'Cache-Control': 'public, max-age=30' } });
    }

    // ── QUOTAZIONE ──
    const s = url.searchParams.get('s');
    if (!s) return new Response(JSON.stringify({ error: 'Missing ?s= or ?q=' }), { status: 400, headers: CORS });
    const yfUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(s) + '?interval=5m&range=1d&includePrePost=false';
    const resp = await fetch(yfUrl, { headers: YF_HEADERS });
    const body = await resp.text();
    return new Response(body, { status: resp.status, headers: { ...CORS, 'Cache-Control': 'public, max-age=30' } });
  },
};
