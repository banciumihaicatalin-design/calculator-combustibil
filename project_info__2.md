# Fuel Calculator — Codebase Overview

## Sumar

**Fuel Calculator** este o aplicație web progresivă (PWA) de tip calculator de combustibil, dezvoltată pentru piața din România. Calculează costul unui drum și autonomia pe baza distanței, consumului mediu și prețului per litru, cu suport complet bilingv (RO/EN). Este un proiect **static, fără build-step și fără framework** — vanilla HTML/CSS/JS — găzduit pe GitHub Pages, cu prețurile de combustibil actualizate zilnic printr-un scraper Python rulat în GitHub Actions. Tot codul de produs se află într-un singur fișier: `app.js` (~1100 linii).

## Arhitectură

- **Pattern**: aplicație monolitică client-side, cu „backend" compus din două servicii externe gratuite:
  1. **GitHub raw CDN** — servește `fuel-prices.json` (date statice actualizate de un cron job)
  2. **Firebase Firestore** — sincronizare în timp real a profilurilor de vehicule între dispozitive (auth anonimă)
- **Fără framework, fără bundler, fără npm**. Codul se încarcă direct în browser; funcțiile sunt expuse global pe `window.*` pentru a putea fi apelate din handlere inline `onclick` din HTML.
- **Tech stack**: HTML5, CSS3 (design tokens + light/dark theme), JavaScript ES6+ vanilla, Firebase compat SDK v10 (app/auth/firestore), Service Worker + Web App Manifest (PWA), `Intl.NumberFormat`, Web Share API, Clipboard API, Google Fonts (Satoshi, Inter, DM Mono), Python 3 + requests + BeautifulSoup4 (scraper).
- **Pornirea execuției**: `index.html` încarcă `firebase-config.js` + `app.js`; la `DOMContentLoaded` se apelează `incarca()` care: restaurează valorile salvate din localStorage → aplică limba/unități/moneda → inițializează Firebase → încarcă prețurile → inițializează butonul de instalare PWA → face un calcul inițial.
- **Bucla principală**: nu există o buclă de runtime — totul e event-driven (evenimente `oninput`/`onclick` care declanșează `recalculeaza()` în timp real la fiecare tastare).

## Structura Directorului

```
fuel-calculator/
├── index.html                              # Markup-ul complet al aplicației (3 tab-uri, 2 modale, toast)
├── app.js                                  # TOATĂ logica: calcule, i18n, prețuri, sync Firebase, istoric, PWA
├── style.css                               # Design system complet: tokens dark/light, toate componentele
├── firebase-config.js                      # Credențiale Firebase (hardcodate; FIREBASE_CONFIG global)
├── fuel-prices.json                        # Prețuri RON/L actualizate zilnic de GitHub Actions (B95/B98/Diesel/GPL)
├── sw.js                                   # Service Worker — cache precache + stale-while-revalidate
├── manifest.json                           # Configurare PWA (standalone, iconițe maskable)
├── scripts/
│   └── fetch_fuel_prices.py                # Scraper Python: peco-online.ro (primar) + globalpetrolprices.com (fallback)
├── .github/workflows/
│   └── update-fuel-prices.yml              # Cron GitHub Actions: zilnic 05:00 UTC, commit automat al prețurilor
├── skills-lock.json                        # Artefact necorelat: lock de skills de design (Leonxlnx/taste-skill) — ignorabil
├── *.png / *.svg                           # Iconițe PWA și favicon-uri
└── README.md                               # Documentație completă bilingvă (EN + RO)
```

## Abstractions Cheie

### `TRADUCERI` (dicționar i18n)
- **Fișier**: `app.js` (linia 1)
- **Responsabilitate**: toate stringurile UI în `en` și `ro`. Include și funcții pentru mesaje cu parametri (`eroareNaN`, `eroareInterval`), plus array-uri de pași pentru ghidul de instalare pe iOS/Android/Desktop.
- **Folosit de**: `aplicaLimba()` care populează DOM-ul prin maparea id-urilor la texte.

### `incarca()` — funcția de inițializare
- **Fișier**: `app.js` (linia ~720)
- **Responsabilitate**: pornește totul. Restaurează din localStorage: distanța, consumul, prețul, limba, unitatea de consum, moneda, tema, codul de sync, prețurile din cache.
- **Secvență**: aplică unități → `aplicaLimba()` → `initFirebase()` → `initFuelPrices()` → `initInstall()` → `recalculeaza()` → atașează handler Enter pe inputuri.

### `recalculeaza()` + `calculeaza()` — calculul de cost
- **Fișier**: `app.js`
- **Responsabilitate**: calculează litri = (distanță/100) × consum(L/100), cost = litri × preț, cost/km, cost/persoană (dacă split e activ). `recalculeaza()` e real-time pe `oninput`; `calculeaza()` e varianta cu buton, care adaugă și în istoric și salvează valorile.
- **Notă**: cele două funcții sunt aproape duplicate — `recalculeaza()` nu salvează în istoric, `calculeaza()` da. Refactor oportun.
- **Validare**: `valideaza()` — distanță 0.1–50,000 km, consum > 0, preț 0.1–1,000; afișează erori în limba activă cu mesaje parametrizate.

### `toL100()` + `CONSUM_LABEL` / `CONSUM_PLACEHOLDER`
- **Fișier**: `app.js`
- **Responsabilitate**: conversia unităților de consum: `km/L` → L/100 (100/val) și `mpg` → L/100 (235.214/val). Factorul 235.214 e standard (US gallon).
- **Folosit de**: `recalculeaza()`, `setTab()` (când treci pe tab-ul Range, consumul e convertit automat), `setConsumUnit()`.

### Pipeline-ul de prețuri de combustibil (3 piese)
1. **`scripts/fetch_fuel_prices.py`** — scraper:
   - Sursa primară: `peco-online.ro/minime.php` — parsing de tabel HTML (`td.pret` pe rânduri de orașe), medie peste orașele reședință de județ. Produce B95, Diesel, GPL.
   - Fallback: `globalpetrolprices.com` cu 3 URL-uri separate pe tip de combustibil; parsează fraza „current ... price in Romania is RON X.XX" cu regex.
   - **B98 nu e răzuit nicăieri** — e calculat ca B95 + 0.65 RON/L (`B98_PREMIUM`).
   - Sanity bounds: PRICE_MIN=2.0, PRICE_MAX=30.0; `_to_float()` gestionează atât formatul european `9,43` cât și cel US `1,234.56`.
   - Dacă ambele surse eșuează pentru un tip, păstrează prețul vechi; scrie `fuel-prices.json` cu `updated` (UTC ISO), `source`, `currency`, `prices`.
2. **`.github/workflows/update-fuel-prices.yml`** — cron `"0 5 * * *"` (05:00 UTC) + `workflow_dispatch`; instalează dependențe, rulează scraperul, face commit doar dacă `fuel-prices.json` s-a schimbat (`git diff --cached --quiet` check).
3. **`app.js` (`fetchFuelPrices`/`initFuelPrices`/`refreshFuelPrices`)** — clientul:
   - URL: `raw.githubusercontent.com/mrmcb92/fuel-calculator/main/fuel-prices.json?t=Date.now()` (cache-busting).
   - Cache în localStorage (`comb_fuelPrices`) cu TTL de **12 ore**; la expirare se reîmprospătează la următoarea vizită.
   - Badge de prospețime (`price-freshness`) arată „↻ updated 01 iul 09:45" — click = refresh manual forțat.
   - Auto-completare preț doar în RON; pentru EUR/USD se afișează notificarea „live prices in RON only".
   - Fallback hardcodat: `FUEL_DEFAULTS_RON` = { B95: 9.43, B98: 10.08, Diesel: 9.53, GPL: 4.41 }.

### Firestore sync (`initFirebase`, `subscribeToProfiles`, `saveProfiles`)
- **Fișier**: `app.js`
- **Model**: fiecare dispozitiv are un **sync code de 6 caractere** (`comb_syncId` în localStorage) generat din `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (fără 0/O/1/I/L — evită confuzia vizuală). Documentul Firestore e `users/{syncId}` cu câmpul `{ profiles: [...] }`.
- **Auth anonimă**: `firebase.auth().signInAnonymously()`; abia după `onAuthStateChanged` cu user se face `db.collection('users').doc(syncId).onSnapshot(...)` — snapshot-ul real-time împinge orice modificare pe toate dispozitivele cu același cod.
- **Fallback offline**: la orice eroare, `profilesCache` revine la localStorage; bara de status afișează `connecting` / `connected` / `offline`.
- **Constrângere**: atât citirea cât și scrierea presupun că regulile Firestore permit auth anonim (comment: „the Firestore rules require request.auth != null").
- **Fără Firebase config valid** → se dezactivează complet sync-ul, rămâne doar modul local.

### Service Worker (`sw.js`)
- **Strategie**: precache la instalare (lista explicită `resurse` cu prefixul `/fuel-calculator/`) + **stale-while-revalidate** la fetch: returnează cache-ul imediat, actualizează cache-ul în fundal când rețeaua răspunde cu 200.
- **Cache name**: `combustibil-v13` — bump manual la fiecare deploy; activate elimină cache-urile vechi.
- **Atenție**: calea din listă e `/fuel-calculator/...` — hardcodată pentru subpath-ul GitHub Pages. La deploy local (e.g. `python3 -m http.server`) asseturile nu vor fi găsite în precache (fetch în install va eșua, dar SW-ul tot se instalează datorită `.catch`).

## Data Flow

1. **Calcul cost** — utilizator tastează în câmpuri → `oninput="recalculeaza()"` → `recalculeaza()` citește `distanta` (aplică ×2 dacă `tur-retur` e bifat), `consum` (convertit prin `toL100` în funcție de unitate), `pret` → `valideaza()` → calculează litri/cost/costPerKm/costPerPax → `afiseazaRezultat()` → carduri `.result-card[data-copy]` → click copiază valoarea în clipboard (delegare globală de eveniment).
2. **Calcul autonomie (Range)** — utilizator introduce `buget`, `consum-r` (preumplut automat din tab-ul Cost la `setTab('range')`), `pret-r` → `calcRange()` → litri = buget/preț; distanță = (litri/consumL100)×100.
3. **Prețuri live** — `initFuelPrices()` → verifică cache localStorage (TTL 12h) → dacă e ok, afișează badge-ul „updated" → altfel `fetchFuelPrices()` din raw CDN → validează valorile (parseFloat > 0) → salvează cache → `applyFuelTypePrice()` completează `#pret` și `#pret-r` (doar RON) → ambele tab-uri rămân sincronizate la schimbarea tipului de combustibil prin `selectFuelType()` (stat global `selectedFuelType` persistat în localStorage).
4. **Sync profile cloud** — `saveProfile()` → `saveProfiles()` → scrie în localStorage + `db.collection('users').doc(syncId).set({profiles}, {merge:true})` → `onSnapshot` pe toate dispozitivele cu același cod → `renderProfiles()` re-popează dropdown-ul.
5. **Cron prețuri (offline față de app)** — GitHub Actions la 05:00 UTC → `python scripts/fetch_fuel_prices.py` → commit la `fuel-prices.json` dacă s-a schimbat → data viitoare când un client descarcă fișierul, primește noile prețuri.

## Comportamente Non-Oviove & Decizii de Design

- **De ce nu există un server**: prețurile sunt date statice publice în repo, servite prin CDN-ul raw GitHub — zero cost, zero API key, CORS-friendly (cache-busting cu `?t=` pentru a evita cache-ul CDN-ului). E o soluție ingenioasă, dar cu un compromis: oricine poate vedea ce e în fișier (transparență totală) și app-ul depinde de uptime-ul raw.githubusercontent.com.
- **Hardcodarea căii `/fuel-calculator/`** în SW, manifest și URL-ul de prețuri — proiectul e conceput să ruleze exclusiv sub subpath-ul GitHub Pages al repo-ului `mrmcb92`. Schimbarea repo-ului/orgului rupe și prețurile și offline-ul.
- **Inconsistențe documentație vs. cod**:
  - README-ul zice „daily at 05:00 UTC / 08:00 Romania time", workflow-ul chiar rulează la `0 5 * * *` — OK, dar comentariul din workflow zice 07:00 UTC (contradicție internă minoră).
  - Comentariul din `app.js` lângă `FUEL_PRICES_URL` zice „updated automatically every Monday" — de fapt e daily.
  - Prețurile default din `app.js` (9.43 RON, comentate „May 2026") diferă de `fuel-prices.json` (8.61 RON, updated 2026-07-01) — normal: fallback-ul e o fotografie veche, dar antrenează confuzie.
- **i18n hibrid**: jumătate din text e în DOM static (EN hardcodat în HTML), iar `aplicaLimba()` suprascrie textContent-ul id-urilor. Adăugarea unui nou element de text necesită modificarea atât a HTML cât și a mapării `ids` din `aplicaLimba()` — ușor de ratat.
- **Funcții globale pe `window`**: fiecare handler inline `onclick` din HTML presupune ca funcția să fie explicit exportată la finalul lui `app.js` (`window.calculeaza = calculeaza`, etc.). Adăugarea unei noi funcții UI fără export = referință undefined în consolă.
- **Firestore merge policy**: `set({ profiles }, { merge: true })` — scrie peste întregul array de profiluri. Ultima scriere câștigă; două dispozitive care salvează simultan își suprascriu reciproc profilurile (last-write-wins, fără conflict resolution).
- **Auth anonimă cu reguli**: sync-ul funcționează doar dacă regulile Firestore acceptă `request.auth != null` + citire/scriere pe `users/{id}`. README-ul spune „Start in test mode" — i.e. pe orice proiect nou asta merge, dar e nesigur pentru producție (oricine cu codul poate citi/scrie).
- **Istoricul ține doar ultimele 10 intrări** (unshift + pop), cu moneda salvată per intrare — istoricul rămâne corect chiar dacă schimbi moneda.
- **Toast & clipboard**: copy-on-tap folosește delegare (un singur `document.addEventListener('click')`), iar `navigator.clipboard` fără fallback — pe HTTP non-localhost clipboard API dispare, copy-ul tace.
- **`skills-lock.json`** e complet necorelat cu aplicația: conține hash-uri de skills de design (Leonxlnx/taste-skill). E probabil un artefact al unui tool extern de dezvoltare UI (skills-lock) comis din greșeală în repo.
- **Puterea de calcul**: totul rulează pe main thread, fără web workers — irelevant la scara asta, dar de remarcat că `recalculeaza()` rulează la fiecare keystroke direct pe DOM.
- **Dependențe externe cu quirk-uri**:
  - Firebase SDK-urile compat sunt încărcate de pe gstatic (CDN) — app-ul nu funcționează fără internet la prima încărcare (SW-ul doar precachează asseturile proprii, nu și SDK-urile externe).
  - Scraperul se bazează pe layout-ul HTML instabil al `peco-online.ro` (`td.pret` exact 3 coloane) și pe regex fragil pentru globalpetrolprices.com — orice modificare de structură a site-ului sursă rupe pipeline-ul fără warning (workflow-ul tot face commit „manual" atunci, păstrând prețuri vechi).
  - Firestore `.onSnapshot` folosește API-ul compat vechi (`collection().doc().onSnapshot`) — nu modular SDK-ul nou.

## Module Reference

| Fișier | Rol |
|--------|-----|
| `index.html` | Markup complet: header, 3 tab-uri (Cost/Range/History), modale sync + install guide, toast; inline script anti-flash pentru temă; încarcă Firebase compat + `firebase-config.js` + `app.js`; înregistrează SW la `load` |
| `app.js` | Întreaga logică de aplicație: i18n, calcule, conversii unități, prețuri (fetch/cache/badge), Firebase sync, profiluri vehicule, istoric, PWA install, temă, share, copy, toast, reset, inițializare |
| `style.css` | Design system complet: variabile CSS dark/light (`:root` și `html[data-theme="light"]`), toate componentele (tabs, seg-ctrl, fuel-type-grid, result cards, modale, sync bar, toast, install steps), animații, focus-visible accessibility |
| `firebase-config.js` | Definirea `FIREBASE_CONFIG` cu credențialele reale (proiect `fuel-calculator-faa50`) |
| `sw.js` | Service Worker: precache la install, stale-while-revalidate, curățare cache-uri vechi la activate |
| `manifest.json` | PWA: `start_url: /fuel-calculator/`, `display: standalone`, iconițe maskable 192/512 |
| `fuel-prices.json` | Datele de preț curente servite în app (B95/B98/Diesel/GPL în RON) — actualizat de CI |
| `scripts/fetch_fuel_prices.py` | Scraper Python: peco-online.ro (tabel HTML → medie pe orașe) + fallback globalpetrolprices.com (regex) + calcul B98; scrie `fuel-prices.json` |
| `.github/workflows/update-fuel-prices.yml` | Cron zilnic 05:00 UTC + dispatch manual; commit automat doar la modificare |
| `skills-lock.json` | Artefact extern (skills de design) — fără impact asupra aplicației |

## Ordine Sugerată de Lectură

1. `README.md` — documentația completă, bilingvă: features, arhitectură, sync cloud, tehnologii. Cel mai bun punct de plecare.
2. `index.html` — vezi structura DOM și toate handlerele inline; stabilește harta id-urilor pe care se bazează `app.js`.
3. `app.js` (primele ~120 linii: `TRADUCERI` + state + Firebase) — înțelegi starea globală și pattern-ul de inițializare.
4. `app.js` (secțiunile fuel prices + calcule) — inima funcționalității: `initFuelPrices`, `recalculeaza`, `calculeaza`, `calcRange`.
5. `scripts/fetch_fuel_prices.py` + `.github/workflows/update-fuel-prices.yml` — pipeline-ul de date care ține prețurile proaspete.
6. `sw.js` + `manifest.json` — stratul PWA/offline.

---

**Pe scurt**: proiectul e un calculator de combustibil pentru România, 100% front-end, fără backend propriu — prețurile vin dintr-un JSON static updatat de un script Python pe GitHub Actions, iar profilurile de vehicule se sincronizează între dispozitive prin Firebase Firestore. Raportul complet a fost salvat și în `project_info__1.md` în rădăcina proiectului.