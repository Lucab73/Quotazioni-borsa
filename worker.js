/**
 * BORSA LIVE — Cloudflare Worker v10
 * Aggiunge: alert Telegram schedulati (Take Profit / Stop Loss)
 *
 * KV Bindings richiesti nel dashboard Cloudflare:
 *   KV           → portafogli (già esistente)
 *   BORSA_ALERTS → alert TP/SL (nuovo)
 *
 * Secrets richiesti (Worker → Settings → Variables → Secrets):
 *   TELEGRAM_TOKEN   → token del bot da @BotFather
 *   TELEGRAM_CHAT_ID → il tuo chat_id numerico
 *
 * Cron Trigger (Worker → Triggers → Cron Triggers):
 *   0 * * * *   → ogni ora esatta  (oppure  *\/30 * * * *  per ogni 30 min)
 */

// ─── COSTANTI ─────────────────────────────────────────────────────────────────

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
  'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Upgrade-Insecure-Requests': '1',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// Cooldown: non ripete lo stesso alert per 4 ore anche se il prezzo rimane oltre soglia
const ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000;

// ─── HELPERS GENERICI ─────────────────────────────────────────────────────────

function isISIN(s) {
  return /^[A-Z]{2}[A-Z0-9]{10}$/.test(s.trim().toUpperCase());
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function createYFFormat(isin, name, price, prevClose, exchange) {
  return {
    chart: {
      result: [{
        meta: {
          symbol: isin,
          longName: name,
          shortName: name,
          regularMarketPrice: price,
          chartPreviousClose: prevClose || price,
          previousClose: prevClose || price,
          currency: 'EUR',
          exchangeName: exchange,
          marketState: 'REGULAR',
        },
        indicators: { quote: [{ close: [] }] },
      }],
    },
  };
}

// ─── SORGENTI DATI (identiche alla v9) ────────────────────────────────────────

async function fetchBorsaItaliana(isin) {
  const url = `https://www.borsaitaliana.it/borsa/scheda/${isin}.html?lang=it`;
  try {
    const resp = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' });
    if (resp.status !== 200) return null;
    const text = await resp.text();
    if (text.includes('Pagina non trovata')) return null;

    const priceMatch =
      text.match(/class="[^"]*-xxlarge[^"]*"[^>]*>\s*([\d,.]+)/i) ||
      text.match(/Prezzo Ultimo Contratto.*?<strong[^>]*>\s*([\d,.]+)/is) ||
      text.match(/Prezzo ultimo contratto[^>]*>.*?([\d,.]+)/is) ||
      text.match(/ultimo contratto[^>]*>.*?([\d,.]+)/is);

    if (!priceMatch) return null;
    const price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));

    let name = isin;
    const h1Match = text.match(/<h1[^>]*>\s*(?:<a[^>]*>)?\s*([^<]+?)\s*(?:<\/a>)?\s*<\/h1>/i);
    if (h1Match && h1Match[1].trim().length > 3) {
      name = h1Match[1].replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    } else {
      const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        name = titleMatch[1]
          .replace(/Scheda\s+del\s+Titolo/i, '')
          .replace(/Scheda/i, '')
          .replace(/-\s*Borsa\s*Italiana/i, '')
          .replace(/Quotazione/i, '')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }

    if (name.toUpperCase().includes('TITOLI DI STATO') && name.length < 25) {
      const cleanTitle = text.match(/<title>([^<]+)<\/title>/i);
      if (cleanTitle) name = cleanTitle[1].split('-')[0].replace(/Scheda/i, '').trim();
    }

    const prevMatch =
      text.match(/Prezzo\s+di\s+riferimento<\/span>.*?<strong[^>]*>\s*([\d,.]+)/is) ||
      text.match(/Prezzo\s+Ufficiale<\/span>.*?<strong[^>]*>\s*([\d,.]+)/is) ||
      text.match(/Riferimento<\/span>.*?<strong[^>]*>\s*([\d,.]+)/is) ||
      text.match(/Prezzo\s+Riferimento[^>]*>.*?([\d,.]+)/is);

    const prevClose = prevMatch
      ? parseFloat(prevMatch[1].replace(/\./g, '').replace(',', '.'))
      : price;

    return createYFFormat(isin, name, price, prevClose, 'Borsa IT');
  } catch (e) {
    return null;
  }
}

async function fetchTeleborsa(isin) {
  try {
    const url = `https://www.teleborsa.it/Ricerca/${isin}`;
    const resp = await fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' });
    const text = await resp.text();

    const priceMatch =
      text.match(/id="[^"]*lblPrice"[^>]*>\s*([\d,.]+)/i) ||
      text.match(/class="prezzo"[^>]*>\s*([\d,.]+)/i);
    if (!priceMatch) return null;

    const price = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
    const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
    let name = isin;
    if (titleMatch) name = titleMatch[1].split('-')[0].replace(/Quotazion[ei]/i, '').trim();

    return createYFFormat(isin, name, price, price, 'Teleborsa');
  } catch (e) {
    return null;
  }
}

async function fetchYahooISIN(isin) {
  try {
    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(isin)}&quotesCount=3`;
    const sResp = await fetch(searchUrl, { headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] } });
    if (!sResp.ok) return null;
    const sData = await sResp.json();
    const quote = sData?.quotes?.find(q => q.symbol);
    if (!quote) return null;

    const sym = quote.symbol;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=5m&range=1d`;
    const resp = await fetch(url, { headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] } });
    if (!resp.ok) return null;

    const data = await resp.json();
    if (data?.chart?.result?.[0]?.meta?.regularMarketPrice != null) {
      const meta = data.chart.result[0].meta;
      meta.symbol  = isin;
      meta.longName  = quote.longname  || quote.shortname || meta.longName;
      meta.shortName = quote.shortname || meta.shortName;
      return data;
    }
  } catch (e) {
    return null;
  }
  return null;
}

// ─── ALERT: FETCH PREZZI ATTUALI DA YAHOO ─────────────────────────────────────

/**
 * Recupera il prezzo corrente per un array di ticker Yahoo standard (es. BTC-USD, ENI.MI).
 * Ritorna un oggetto { ticker: prezzo }.
 */
async function fetchPrices(tickers) {
  const prices = {};
  // Chiama i ticker in parallelo per velocità (il Worker ha 30s di CPU time)
  await Promise.all(tickers.map(async ticker => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=5m&range=1d`;
      const resp = await fetch(url, { headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] } });
      if (!resp.ok) return;
      const data = await resp.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price != null) prices[ticker] = price;
    } catch (_) { /* ticker non disponibile, ignoriamo */ }
  }));
  return prices;
}

// ─── ALERT: INVIO MESSAGGIO TELEGRAM ──────────────────────────────────────────

async function sendTelegram(env, text) {
  const token  = env.TELEGRAM_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // secrets non configurati: silenzioso

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });
}

// ─── ALERT: LOGICA PRINCIPALE (chiamata dal cron) ─────────────────────────────

async function checkAlerts(env) {
  if (!env.BORSA_ALERTS) return; // KV non configurato

  // 1. Leggi la lista alert salvata dall'app
  const alerts = await env.BORSA_ALERTS.get('alerts', { type: 'json' });
  if (!alerts || alerts.length === 0) return;

  // 2. Tickers unici → una sola chiamata per ticker
  const tickers = [...new Set(alerts.map(a => a.ticker))];
  const prices  = await fetchPrices(tickers);

  // 3. Storico degli ultimi invii (per applicare il cooldown)
  const fired = (await env.BORSA_ALERTS.get('fired', { type: 'json' })) ?? {};
  const nowMs = Date.now();

  for (const alert of alerts) {
    const price = prices[alert.ticker];
    if (price == null) continue; // ticker non raggiunto questa volta

    const keyTP = `${alert.ticker}_tp`;
    const keySL = `${alert.ticker}_sl`;

    // ── Take Profit ──────────────────────────────────────────────────────────
    if (alert.tp != null && price >= alert.tp) {
      const lastFired = fired[keyTP] ?? 0;
      if (nowMs - lastFired > ALERT_COOLDOWN_MS) {
        await sendTelegram(env,
          `🟢 *TAKE PROFIT* — ${alert.ticker}\n` +
          `Prezzo attuale: *${fmt(price)}*\n` +
          `Target TP: ${fmt(alert.tp)}\n` +
          (alert.pmc ? `PMC: ${fmt(alert.pmc)} | ${pct(alert.pmc, price)}` : '')
        );
        fired[keyTP] = nowMs;
      }
    }

    // ── Stop Loss ────────────────────────────────────────────────────────────
    if (alert.sl != null && price <= alert.sl) {
      const lastFired = fired[keySL] ?? 0;
      if (nowMs - lastFired > ALERT_COOLDOWN_MS) {
        await sendTelegram(env,
          `🔴 *STOP LOSS* — ${alert.ticker}\n` +
          `Prezzo attuale: *${fmt(price)}*\n` +
          `Stop SL: ${fmt(alert.sl)}\n` +
          (alert.pmc ? `PMC: ${fmt(alert.pmc)} | ${pct(alert.pmc, price)}` : '')
        );
        fired[keySL] = nowMs;
      }
    }
  }

  // 4. Salva lo storico aggiornato
  await env.BORSA_ALERTS.put('fired', JSON.stringify(fired));
}

// ─── HELPERS FORMATO ──────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return '—';
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(pmc, price) {
  if (!pmc || pmc === 0) return '';
  const p = ((price - pmc) / pmc * 100).toFixed(2);
  return (p >= 0 ? '+' : '') + p + '%';
}

// ─── EXPORT DEFAULT (fetch + scheduled) ───────────────────────────────────────

export default {

  // ── Handler HTTP ────────────────────────────────────────────────────────────
  async fetch(request, env) {
    const url = new URL(request.url);

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const action   = url.searchParams.get('action');
    const pathname = url.pathname;

    // ── PORTAFOGLI: salva ──────────────────────────────────────────────────
    if (action === 'save' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { id, name, pin, tickers, caricos, alerts } = body;
        if (!id || !name || !pin || !Array.isArray(tickers)) return json({ error: 'Missing fields' }, 400);
        if (env.KV) await env.KV.put('portfolio:' + id, JSON.stringify({
          id, name, pin, tickers,
          caricos: caricos || {},
          alerts:  alerts  || {},
          updatedAt: new Date().toISOString()
        }));
        return json({ ok: true, id });
      } catch (e) { return json({ error: e.message }, 500); }
    }

    // ── PORTAFOGLI: carica ─────────────────────────────────────────────────
    if (action === 'load') {
      const id  = url.searchParams.get('id');
      const pin = url.searchParams.get('pin');
      if (!id || !pin || !env.KV) return json({ error: 'Missing id/pin' }, 400);
      const raw = await env.KV.get('portfolio:' + id);
      if (!raw) return json({ error: 'Not found' }, 404);
      const data = JSON.parse(raw);
      if (data.pin !== pin) return json({ error: 'Wrong PIN' }, 401);
      return json({ ok: true, portfolio: {
        id:      data.id,
        name:    data.name,
        tickers: data.tickers,
        caricos: data.caricos || {},
        alerts:  data.alerts  || {},
      }});
    }

    // ── ALERT: leggi ──────────────────────────────────────────────────────
    if (pathname === '/alerts' && request.method === 'GET') {
      if (!env.BORSA_ALERTS) return json({ error: 'BORSA_ALERTS KV not bound' }, 500);
      const data = (await env.BORSA_ALERTS.get('alerts', { type: 'json' })) ?? [];
      return json(data);
    }

    // ── ALERT: salva ───────────────────────────────────────────────────────
    if (pathname === '/alerts' && request.method === 'POST') {
      if (!env.BORSA_ALERTS) return json({ error: 'BORSA_ALERTS KV not bound' }, 500);
      try {
        const body = await request.json();
        if (!Array.isArray(body)) return json({ error: 'Expected array' }, 400);
        await env.BORSA_ALERTS.put('alerts', JSON.stringify(body));
        return json({ ok: true });
      } catch (e) { return json({ error: e.message }, 500); }
    }

    // ── RICERCA LIVE ───────────────────────────────────────────────────────
    const q = url.searchParams.get('q');
    if (q) {
      const searchUrl = 'https://query1.finance.yahoo.com/v1/finance/search?q=' +
        encodeURIComponent(q) + '&quotesCount=10&enableFuzzyQuery=true';
      const resp = await fetch(searchUrl, { headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] } });
      return new Response(await resp.text(), {
        status: resp.status,
        headers: { ...CORS, 'Cache-Control': 'public, max-age=30' },
      });
    }

    // ── QUOTAZIONE SINGOLO TITOLO ──────────────────────────────────────────
   if (pathname === '/test-alert') {
     await checkAlerts(env);
     return json({ ok: true, ts: new Date().toISOString() });
   }
    const s = url.searchParams.get('s');
    if (!s) return json({ error: 'Missing ?s=' }, 400);

    const symUpper = s.trim().toUpperCase();

    // ISIN → catena di fallback: Borsa IT → Yahoo ricerca → Teleborsa
    if (isISIN(symUpper)) {
      let data = await fetchBorsaItaliana(symUpper);
      if (data) return new Response(JSON.stringify(data), { headers: { ...CORS, 'Cache-Control': 'public, max-age=60' } });

      data = await fetchYahooISIN(symUpper);
      if (data) return new Response(JSON.stringify(data), { headers: { ...CORS, 'Cache-Control': 'public, max-age=60' } });

      data = await fetchTeleborsa(symUpper);
      if (data) return new Response(JSON.stringify(data), { headers: { ...CORS, 'Cache-Control': 'public, max-age=60' } });

      return json({ chart: { error: { code: 'Not Found', description: 'ISIN non trovato' } } }, 404);
    }

    // Ticker standard (AAPL, ENI.MI, BTC-USD …)
    const yfUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
      encodeURIComponent(symUpper) + '?interval=5m&range=1d&includePrePost=false';
    const resp = await fetch(yfUrl, { headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] } });
    return new Response(await resp.text(), {
      status: resp.status,
      headers: { ...CORS, 'Cache-Control': 'public, max-age=30' },
    });
  },

  // ── Handler cron schedulato ───────────────────────────────────────────────
  async scheduled(event, env, ctx) {
    ctx.waitUntil(checkAlerts(env));
  },
};