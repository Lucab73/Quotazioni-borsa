# 📈 Borsa Live

App web **mobile-first** per monitorare quotazioni di borsa in tempo reale, installabile come app nativa su Android e iOS (PWA). Completamente gratuita, nessuna API key richiesta.

![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-blue)
![Cloudflare Workers](https://img.shields.io/badge/proxy-Cloudflare%20Workers-orange)
![PWA](https://img.shields.io/badge/PWA-installabile-green)
![Telegram](https://img.shields.io/badge/alert-Telegram-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## ✨ Funzionalità

### 📊 Quotazioni
- Quotazioni in tempo reale (ritardo ~15 min, gratuito)
- 🔍 **Ricerca live** per nome — digita "Ferrari" e trova `RACE.MI` senza conoscere il simbolo
- 🇮🇹 Borsa italiana, 🇺🇸 USA, 📦 ETF/ETP, ₿ Crypto, 🥇 Materie prime, 💱 Forex
- Supporto **ISIN** — risoluzione automatica tramite Borsa Italiana, Yahoo Finance, Teleborsa
- Preset rapidi per categoria con chip selezionabili
- Skeleton loading durante il caricamento dei dati
- 🔄 Aggiornamento automatico ogni 60 secondi con countdown nel footer

### 💼 Scheda titolo (Detail Panel)
Tocca un titolo per aprire la scheda dettaglio con:
- Prezzo corrente, variazione assoluta e percentuale
- Chiusura precedente, mercato di quotazione, valuta
- **Stato del mercato**: Aperto / Pre-market / After-hours / Chiuso
- **Posizione personale**: inserisci prezzo medio di carico (PMC) e quantità per calcolare:
  - Variazione percentuale dal carico
  - P&L totale in valuta
  - Valore attuale della posizione
- **Alert automatico**: imposta Take Profit e Stop Loss direttamente dalla scheda (vedi sotto)

### 🔔 Alert Telegram automatici
- Imposta **🟢 Take Profit** e **🔴 Stop Loss** per ogni titolo direttamente dalla scheda dettaglio
- Un Worker Cloudflare schedulato controlla i prezzi **ogni ora** tramite Yahoo Finance
- Se il prezzo supera il TP o scende sotto lo SL → arriva un messaggio Telegram sul telefono:
  ```
  🟢 TAKE PROFIT — BTC-USD
  Prezzo attuale: 96.430
  Target TP: 95.000
  PMC: 81.200 | +18,76%
  ```
- Cooldown di 4 ore: lo stesso alert non si ripete ogni ora se il prezzo rimane oltre soglia
- Endpoint `/test-alert` per testare il sistema senza aspettare il cron

### 🗂 Portafogli multipli
- Crea **più portafogli** separati, ognuno con nome e lista titoli indipendenti
- Ogni portafoglio è protetto da un **PIN a 4 cifre**
- **Sync cloud completo**: tickers, PMC, quantità, TP e SL vengono salvati nel KV di Cloudflare
- **Ripristino su altro dispositivo**: inserisci ID e PIN → tutto viene ripristinato esattamente come lo hai lasciato (inclusi PMC e alert)
- **Rinomina** portafoglio con prompt nativo (funziona perfettamente su mobile)
- **Elimina** portafoglio con conferma
- Indicatore nel footer: ☁ = sync OK, ⚠ = worker non raggiunto

### 🛠 Gestione lista
- ➕ Aggiungi titoli con ricerca live o preset rapidi per categoria
- ✕ Rimuovi titoli in modalità modifica
- ↕️ **Drag & drop** per riordinare (touch nativo e mouse)
- 💾 Tutto salvato in `localStorage` — persiste tra le sessioni

### 📲 App nativa (PWA)
- Installabile sulla schermata Home di **Android** (Chrome) e **iOS** (Safari)
- Guida di installazione integrata nell'app (pulsante ⬇ nell'header)
- Supporto `safe-area-inset` per iPhone con notch
- Service Worker per funzionamento **offline** (cache)
- Tema scuro nativo, nessuna barra browser visibile

---

## 🏗 Architettura

```
GitHub Pages              Cloudflare Worker                  Yahoo Finance
(index.html)  ──────►  (proxy CORS + KV storage)  ────►  (quotazioni e ricerca)
     │                          │
     │                          ├── KV: portafogli (tickers, PMC, TP/SL)
     │                          ├── KV: alert (BORSA_ALERTS)
     │                          └── Cron ogni ora → checkAlerts → Telegram Bot API
     │
     └── sw.js         (Service Worker, cache offline)
     └── manifest.json (metadati PWA)
```

**Perché il Worker?**
Yahoo Finance blocca le richieste dirette dal browser (CORS). Il Worker Cloudflare fa da proxy personale, gestisce il salvataggio cloud dei portafogli nel KV e gira il cron schedulato per gli alert. Tutto gratuito fino a 100.000 richieste/giorno.

---

## 🚀 Setup completo

### Parte 1 — Cloudflare Worker (~5 minuti)

1. Vai su [workers.cloudflare.com](https://workers.cloudflare.com) → crea account gratuito (no carta di credito)
2. Dashboard → **Workers & Pages** → **Create** → **Start with Hello World!**
3. Dai un nome (es. `borsa-proxy`) → **Deploy**
4. Clicca **Edit code** → cancella tutto → incolla il contenuto di `worker.js` → **Deploy**
5. Copia l'URL (es. `https://borsa-proxy.tuonome.workers.dev`)

**KV Namespace (per portafogli e alert):**
1. Dashboard → **Workers KV** → **Create namespace** → nome: `BORSA_KV` → Create
2. Crea un secondo namespace → nome: `BORSA_ALERTS` → Create
3. Vai sul tuo Worker → **Bindings** → **Add binding**:
   - Variable name: `KV` → KV Namespace: `BORSA_KV`
   - Variable name: `BORSA_ALERTS` → KV Namespace: `BORSA_ALERTS`
4. **Save**

**Cron Trigger (per alert automatici):**
1. Worker → **Settings** → **Trigger Events** → **Add**
2. Tipo: `Cron` → Schedule: `0 * * * *` (ogni ora) → **Add**

### Parte 2 — Bot Telegram (~2 minuti)

1. Apri Telegram → cerca **@BotFather** → `/newbot` → segui le istruzioni
2. Copia il **token** ricevuto (es. `123456789:AABBccDD...`)
3. Scrivi `/start` al tuo bot, poi apri nel browser:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
   Trova il tuo `chat_id` nel JSON (`"chat":{"id":123456789}`)
4. Worker → **Settings** → **Variables** → **Secrets**:
   - `TELEGRAM_TOKEN` = il token del bot
   - `TELEGRAM_CHAT_ID` = il tuo chat_id numerico

### Parte 3 — GitHub Pages (~2 minuti)

1. Crea un repo pubblico su GitHub (es. `borsa-live`)
2. Carica tutti i file:
   ```
   index.html
   worker.js      ← solo per archivio, non viene eseguito da qui
   manifest.json
   sw.js
   icon-192.png
   icon-512.png
   ```
3. **Settings → Pages** → Source: `main` / `/(root)` → **Save**
4. Dopo 1-2 minuti l'app è live su `https://tuousername.github.io/borsa-live/`

### Parte 4 — Prima configurazione nell'app

1. Apri l'app nel browser
2. Tocca **+** → inserisci l'URL del Worker → **Salva**
3. Tocca il nome del portafoglio nell'header → **Crea** → scegli nome e PIN a 4 cifre
4. Aggiungi titoli con **+**

### Parte 5 — Ripristinare un portafoglio su altro dispositivo

1. Sul dispositivo originale: annota l'**ID** del portafoglio (es. `A1B2C3D4`) visibile nella card
2. Sul nuovo dispositivo: apri il Gestore portafogli → **"Carica da un altro dispositivo"**
3. Inserisci ID + PIN → vengono ripristinati tickers, PMC, quantità, TP e SL ✓

### Parte 6 — Installazione come app

**Android (Chrome):** tocca l'icona ⬇ nell'header, oppure **menu ⋮ → Aggiungi a schermata Home**

**iOS (Safari):** **Condividi → Aggiungi alla schermata Home**

### Parte 7 — Testare gli alert Telegram

Imposta un Take Profit bassissimo (es. `1` su BTC-USD) → salva → apri nel browser:
```
https://borsa-proxy.tuonome.workers.dev/test-alert
```
Deve arrivare un messaggio Telegram entro pochi secondi. Poi reimposta il valore reale.

---

## 📋 Simboli supportati

| Tipo | Formato | Esempi |
|------|---------|--------|
| Azioni Milano | `TICKER.MI` | `ENI.MI` `UCG.MI` `RACE.MI` `ISP.MI` |
| Azioni USA | `TICKER` | `AAPL` `TSLA` `NVDA` `MSFT` |
| ETF su Borsa IT | `TICKER.MI` | `SWDA.MI` `VWCE.MI` `CSPX.MI` |
| ETC/ETP su Borsa IT | `TICKER.MI` | `PHAU.MI` (oro) `BCOIN.MI` (BTC) |
| Crypto spot | `COIN-USD` | `BTC-USD` `ETH-USD` `SOL-USD` |
| Materie prime | `CODICE=F` | `GC=F` (oro) `CL=F` (petrolio) `SI=F` (argento) |
| Forex | `COPPIA=X` | `EURUSD=X` `GBPUSD=X` `USDJPY=X` |
| ISIN | `XX0000000000` | `IT0003132476` `US0378331005` |

> 💡 **Suggerimento:** usa la ricerca live — digita il nome dell'azienda e l'app trova il simbolo corretto automaticamente.

---

## 📁 File del progetto

| File | Dove gira | Descrizione |
|------|-----------|-------------|
| `index.html` | GitHub Pages | App completa (HTML + CSS + JS in un unico file) |
| `worker.js` | Cloudflare Workers | Proxy CORS, KV storage portafogli, cron alert Telegram |
| `manifest.json` | GitHub Pages | Metadati PWA (nome, icona, colori, display mode) |
| `sw.js` | GitHub Pages | Service Worker — cache offline e aggiornamento versione |
| `icon-192.png` | GitHub Pages | Icona app 192×192px |
| `icon-512.png` | GitHub Pages | Icona app 512×512px |

> `worker.js` va deployato su **Cloudflare** (obbligatorio) e tenuto su **GitHub** (solo archivio).

---

## ⚙️ Personalizzazione

### Colori (CSS variables in `index.html`)
```css
:root {
  --bg: #0f0f14;        /* sfondo principale */
  --accent: #7c6af7;    /* colore primario (pulsanti, focus) */
  --green: #22c97a;     /* rialzo / positivo */
  --red: #e8504a;       /* ribasso / negativo */
}
```

### Intervallo aggiornamento automatico
Cerca `countdownSec=60` nel JS e cambia il valore in secondi.

### Frequenza cron alert
Nel dashboard Cloudflare → Worker → **Settings → Trigger Events**:
- `0 * * * *` → ogni ora esatta
- `*/30 * * * *` → ogni 30 minuti
- `0 9,17 * * 1-5` → alle 9 e alle 17, solo giorni feriali

### Aggiornare l'app dopo modifiche
Ogni volta che modifichi `index.html`, incrementa il numero di versione in `sw.js`:
```js
const CACHE = 'borsa-live-v4'; // era v3 → diventa v4
```
Questo forza il refresh della cache su tutti i dispositivi.

### Aggiornare il Worker
Dashboard → il tuo Worker → **Edit code** → incolla → **Deploy**. Poi aggiorna anche su GitHub per tenere il sorgente allineato.

---

## 🔒 Privacy e sicurezza

- Nessun dato personale viene raccolto
- La lista titoli, PMC e alert sono salvati nel **browser locale** (localStorage) e opzionalmente nel **KV Cloudflare** solo se si usa la funzione portafogli
- I portafogli cloud sono protetti da PIN — senza PIN corretto non è possibile caricare i dati
- Il Worker fa da proxy: non registra né conserva dati al di là di quelli esplicitamente salvati tramite l'app
- Il bot Telegram invia messaggi **solo al tuo chat_id** — nessun altro può riceverli
- Nessun account richiesto, nessuna registrazione

---

## 📄 Licenza

MIT — libero di usare, modificare e distribuire.

---

*Dati forniti da Yahoo Finance con ritardo di ~15 minuti. Non utilizzare per decisioni di investimento in tempo reale.*
