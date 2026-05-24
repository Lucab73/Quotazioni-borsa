# 📈 Borsa Live

App web **mobile-first** per monitorare quotazioni di borsa in tempo reale, installabile come app nativa su Android e iOS (PWA). Completamente gratuita, nessuna API key richiesta.

![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-blue)
![Cloudflare Workers](https://img.shields.io/badge/proxy-Cloudflare%20Workers-orange)
![PWA](https://img.shields.io/badge/PWA-installabile-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## ✨ Funzionalità

### 📊 Quotazioni
- Quotazioni in tempo reale (ritardo ~15 min, gratuito)
- 🔍 **Ricerca live** per nome — digita "Ferrari" e trova `RACE.MI` senza conoscere il simbolo
- 🇮🇹 Borsa italiana, 🇺🇸 USA, 📦 ETF/ETP, ₿ Crypto, 🥇 Materie prime, 💱 Forex
- Preset rapidi per categoria con chip selezionabili
- Skeleton loading durante il caricamento dei dati
- Indicatore visivo rialzo/ribasso/invariato su ogni riga
- 🔄 Aggiornamento automatico ogni 60 secondi con countdown nel footer

### 💼 Scheda titolo (Detail Panel)
Tocca un titolo per aprire la scheda dettaglio con:
- Prezzo corrente in grande, variazione assoluta e percentuale
- Chiusura precedente, mercato di quotazione, valuta
- **Stato del mercato**: Aperto / Pre-market / After-hours / Chiuso
- **Posizione personale**: inserisci il prezzo medio di carico e la quantità per calcolare:
  - Variazione percentuale dal carico
  - P&L totale in valuta
  - Valore attuale della posizione
- Rimozione diretta del titolo dalla scheda

### 🗂 Portafogli multipli
- Crea **più portafogli** separati, ognuno con nome e lista titoli indipendenti
- Ogni portafoglio è protetto da un **PIN a 4 cifre** scelto alla creazione
- **Rinomina** qualsiasi portafoglio con il prompt nativo del sistema (✏️) — funziona perfettamente su mobile
- **Elimina** un portafoglio con conferma nativa
- Il portafoglio attivo è evidenziato con badge verde
- Nome del portafoglio attivo sempre visibile nell'header, toccabile per aprire il gestore

### ☁ Sync cloud (opzionale)
- **Salva su cloud** tramite il tuo Cloudflare Worker: i dati del portafoglio (nome, PIN, lista titoli) vengono sincronizzati automaticamente ad ogni modifica
- **Carica da un altro dispositivo**: inserisci l'ID e il PIN di un portafoglio esistente per importarlo — funziona tra telefoni, tablet e desktop
- Indicatore nel footer: ☁ = sync OK, ⚠ = worker non raggiunto
- Il cloud è opzionale: l'app funziona completamente in locale anche senza Worker

### 🛠 Gestione lista
- ➕ Aggiungi titoli con ricerca live o selezione rapida dai preset
- ✕ Rimuovi titoli in modalità modifica
- ↕️ **Drag & drop** per riordinare i titoli (touch nativo e mouse)
- 💾 Tutto salvato in `localStorage` — persiste tra le sessioni senza bisogno di account

### 📲 App nativa (PWA)
- Installabile sulla schermata Home di **Android** (Chrome) e **iOS** (Safari)
- Guida di installazione integrata nell'app (pulsante ⬇ nell'header)
- Supporto `safe-area-inset` per iPhone con notch
- Service Worker per funzionamento **offline** (cache)
- Tema scuro nativo, nessuna barra browser visibile una volta installata

---

## 🏗 Architettura

```
GitHub Pages          Cloudflare Worker              Yahoo Finance
(index.html)  ──►  (proxy CORS + storage cloud)  ──►  (quotazioni
     │                                                  e ricerca)
     │
     └── sw.js        (Service Worker, cache offline)
     └── manifest.json (metadati PWA)
```

**Perché il Worker?**
Yahoo Finance blocca le richieste dirette dal browser (CORS). Il Worker Cloudflare fa da proxy personale: gratuito fino a 100.000 richieste/giorno, stabile e veloce. Gestisce sia le quotazioni/ricerca sia il salvataggio dei portafogli in cloud (KV store).

---

## 🚀 Setup completo

### Parte 1 — Cloudflare Worker (~3 minuti)

1. Vai su [workers.cloudflare.com](https://workers.cloudflare.com) → crea account gratuito (no carta di credito)
2. Dashboard → **Workers & Pages** → **Create** → **Start with Hello World!**
3. Dai un nome (es. `borsa-proxy`) → **Deploy**
4. Clicca **Edit code** → cancella tutto → incolla il contenuto di `worker.js`
5. Clicca **Deploy** → copia l'URL (es. `https://borsa-proxy.tuonome.workers.dev`)

### Parte 2 — GitHub Pages (~2 minuti)

1. Crea un repo pubblico su GitHub (es. `borsa-live`)
2. Carica tutti i file:
   ```
   index.html
   worker.js
   manifest.json
   sw.js
   icon-192.png
   icon-512.png
   ```
3. Vai in **Settings → Pages** → Source: `main` / `/(root)` → **Save**
4. Dopo 1-2 minuti l'app è live su `https://tuousername.github.io/borsa-live/`

### Parte 3 — Prima configurazione

1. Apri l'app nel browser
2. Tocca **+** → nel pannello inserisci l'URL del Worker → **Salva**
3. I dati vengono caricati subito ✓

### Parte 4 — Creare il primo portafoglio

1. Tocca il nome del portafoglio nell'header → si apre il **Gestore portafogli**
2. Inserisci un nome (es. "Azionario IT") → tocca **Crea**
3. Scegli un PIN a 4 cifre — ti servirà per accedere da altri dispositivi
4. Aggiungi titoli con il pulsante **+**

### Parte 5 — Caricare un portafoglio su un altro dispositivo

1. Sul dispositivo originale: annota l'**ID** del portafoglio (visibile nella card, es. `A1B2C3D4`)
2. Sul nuovo dispositivo: apri il Gestore portafogli → sezione **"Carica da un altro dispositivo"**
3. Inserisci ID e PIN → il portafoglio viene scaricato dal cloud ✓

### Parte 6 — Installazione come app

**Android (Chrome):**
1. Apri Chrome → vai sull'URL GitHub Pages
2. Tocca l'icona **⬇** nell'header → segui le istruzioni
3. Oppure: **menu ⋮ → Aggiungi a schermata Home**

**iOS (Safari):**
1. Apri Safari → vai sull'URL GitHub Pages
2. Tocca **Condividi** → **Aggiungi alla schermata Home**
3. L'icona appare sulla Home come un'app nativa 🎉

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

> 💡 **Suggerimento:** usa la ricerca live — digita il nome dell'azienda e l'app trova il simbolo corretto automaticamente.

---

## 📁 File del progetto

| File | Descrizione |
|------|-------------|
| `index.html` | App completa (HTML + CSS + JS in un unico file) |
| `worker.js` | Proxy Cloudflare — gestisce quotazioni, ricerca e sync portafogli (KV) |
| `manifest.json` | Metadati PWA (nome, icona, colori, display mode) |
| `sw.js` | Service Worker per funzionamento offline e cache |
| `icon-192.png` | Icona app 192×192px |
| `icon-512.png` | Icona app 512×512px |

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
Cerca `countdownSec=60` nel JS e cambia il valore (in secondi).

### Titoli di default
I titoli mostrati alla prima apertura (prima di creare un portafoglio) sono definiti in:
```js
if (!tickers.length) tickers = ['ENI.MI', 'UCG.MI', 'AAPL', 'BTC-USD'];
```

### Aggiornare il Worker su Cloudflare
Se modifichi `worker.js`, ricordati di ridistribuirlo:
Dashboard → il tuo worker → **Edit code** → incolla → **Deploy**.

---

## 🔒 Privacy e sicurezza

- Nessun dato personale viene raccolto
- La lista dei titoli e i portafogli sono salvati **solo nel browser locale** (localStorage)
- Il Worker Cloudflare fa da proxy: non registra né conserva dati al di fuori di ciò che tu stesso salvi in cloud tramite la funzione sync
- I portafogli cloud sono protetti da PIN — senza PIN corretto non è possibile caricare i dati
- Nessun account richiesto, nessuna registrazione

---

## 📄 Licenza

MIT — libero di usare, modificare e distribuire.

---

*Dati forniti da Yahoo Finance con ritardo di ~15 minuti. Non utilizzare per decisioni di investimento in tempo reale.*
