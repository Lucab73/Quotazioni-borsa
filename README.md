[README .md](https://github.com/user-attachments/files/28176948/README.md)
# 📈 Borsa Live

App web **mobile-first** per monitorare quotazioni di borsa in tempo reale, installabile come app nativa su Android (PWA). Completamente gratuita, nessuna API key richiesta.

![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-blue)
![Cloudflare Workers](https://img.shields.io/badge/proxy-Cloudflare%20Workers-orange)
![PWA](https://img.shields.io/badge/PWA-installabile-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## ✨ Funzionalità

- 📊 Quotazioni in tempo reale (ritardo ~15 min, gratuito)
- 🔍 **Ricerca live** per nome — digita "Ferrari" e trova `RACE.MI` senza conoscere il simbolo
- 🇮🇹 Borsa italiana, 🇺🇸 USA, 📦 ETF/ETP, ₿ Crypto, 🥇 Materie prime, 💱 Forex
- ➕ Aggiungi/rimuovi titoli con un tocco
- ↕️ **Drag & drop** per riordinare i titoli (touch e mouse)
- 💾 Lista salvata nel browser — persiste tra le sessioni
- 🔄 Aggiornamento automatico ogni 60 secondi
- 📲 **Installabile come app** sulla schermata Home di Android
- 🎨 UI stile widget compatta, tema scuro

---

## 🏗 Architettura

```
GitHub Pages          Cloudflare Worker         Yahoo Finance
(index.html)  ──►  (proxy CORS gratuito)  ──►  (dati quotazioni
     │                                           e ricerca)
     │
     └── sw.js (Service Worker, cache offline)
     └── manifest.json (PWA metadata)
```

**Perché il Worker?**  
Yahoo Finance blocca le richieste dirette dal browser (CORS). Il Worker Cloudflare fa da proxy personale: gratuito fino a 100.000 richieste/giorno, stabile e veloce.

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

### Parte 4 — Installazione su Android

1. Apri Chrome sul telefono → vai sull'URL GitHub Pages
2. Tocca l'icona **⬇** nell'header → segui le istruzioni
3. Oppure: **menu ⋮ → Aggiungi a schermata Home**
4. L'icona appare sulla Home come un'app nativa 🎉

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
| `worker.js` | Proxy Cloudflare — da deployare su Cloudflare Workers |
| `manifest.json` | Metadati PWA (nome, icona, colori) |
| `sw.js` | Service Worker per funzionamento offline |
| `icon-192.png` | Icona app 192×192px |
| `icon-512.png` | Icona app 512×512px |

---

## ⚙️ Personalizzazione

### Colori (CSS variables in `index.html`)
```css
:root {
  --bg: #0f0f14;        /* sfondo */
  --accent: #7c6af7;    /* colore principale */
  --green: #22c97a;     /* rialzo */
  --red: #e8504a;       /* ribasso */
}
```

### Intervallo aggiornamento
Cerca `countdownSec=60` nel JS e cambia il valore in secondi.

### Aggiornare il Worker su Cloudflare
Se aggiorni `worker.js`, ricordati di rideplogare anche su Cloudflare:
Dashboard → il tuo worker → **Edit code** → incolla → **Deploy**.

---

## 🔒 Privacy e sicurezza

- Nessun dato personale viene raccolto
- La lista dei titoli è salvata **solo nel browser locale** (localStorage)
- Il Worker Cloudflare fa solo da proxy: non registra né conserva dati
- Nessun account richiesto, nessuna registrazione

---

## 📄 Licenza

MIT — libero di usare, modificare e distribuire.

---

*Dati forniti da Yahoo Finance con ritardo di ~15 minuti. Non utilizzare per decisioni di investimento in tempo reale.*
