# Borsa Live — Setup completo

---

## PARTE 1 — Cloudflare Worker (proxy dati)

### Perché serve?
I proxy pubblici gratuiti sono inaffidabili. Il Worker è un proxy personale
su Cloudflare: gratuito, stabile, 100.000 richieste/giorno.

### Setup Worker (una volta sola, ~3 minuti)
1. Vai su **https://workers.cloudflare.com** → crea account gratuito
2. Dashboard → **Workers & Pages** → **Create** → **Start with Hello World!**
3. Dai un nome (es. `borsa-proxy`) → **Deploy**
4. Clicca **"Edit code"** → cancella tutto → incolla il contenuto di `worker.js`
5. Clicca **"Deploy"** in alto a destra
6. Copia l'URL (es. `https://borsa-proxy.tuonome.workers.dev`)

### Configura l'app
1. Apri `index.html` nel browser
2. Nel banner rosso incolla l'URL del Worker → **Salva e avvia** ✓

---

## PARTE 2 — Installa come app sul Pixel (PWA)

### Metodo A — GitHub Pages (consigliato)
Per installare la PWA sul telefono, l'app deve essere servita da HTTPS.
GitHub Pages è gratuito e fa al caso:

1. Crea un account su **https://github.com** (se non ce l'hai)
2. Clicca **"New repository"** → nome: `borsa-live` → Public → **Create**
3. Carica tutti i file nel repo:
   - `index.html`
   - `worker.js`
   - `manifest.json`
   - `sw.js`
   - `icon-192.png`
   - `icon-512.png`
4. Vai in **Settings → Pages**
5. Source: **"Deploy from a branch"** → branch: `main` → cartella: `/(root)` → **Save**
6. Dopo 1-2 minuti l'app è live su:
   `https://tuousername.github.io/borsa-live/`

### Installazione su Pixel
1. Apri Chrome sul Pixel
2. Vai su `https://tuousername.github.io/borsa-live/`
3. Inserisci l'URL del Worker nel banner rosso → Salva
4. Apparirà in basso un banner **"Installa Borsa Live"** → tocca **Installa**
5. L'app appare nella schermata Home come qualsiasi altra app! 🎉

### Metodo B — Solo locale (senza GitHub)
Se vuoi solo testare sul Pixel senza pubblicare:
1. Installa l'app **"Simple HTTP Server"** dal Play Store sul Pixel
2. Metti i file in una cartella
3. Avvia il server sulla porta 8080
4. Aprila da Chrome: `http://localhost:8080`
5. Tre puntini → **"Aggiungi alla schermata Home"**
(In questo caso la PWA funziona solo quando il server è attivo)

---

## Simboli supportati

| Tipo            | Formato   | Esempio                     |
|-----------------|-----------|-----------------------------|
| Azioni Milano   | TICKER.MI | ENI.MI · UCG.MI · RACE.MI  |
| Azioni USA      | TICKER    | AAPL · TSLA · NVDA          |
| ETF su Borsa IT | TICKER.MI | SWDA.MI · VWCE.MI · CSPX.MI|
| ETC/ETP         | TICKER.MI | PHAU.MI · BCOIN.MI          |
| Crypto          | COIN-USD  | BTC-USD · ETH-USD · SOL-USD |
| Materie prime   | CODICE=F  | GC=F (oro) · CL=F (petrolio)|
| Forex           | COPPIA=X  | EURUSD=X · GBPUSD=X         |

