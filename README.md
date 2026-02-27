# Trading 212 Veroilmoitus

[![Deploy GitHub Pages](https://github.com/aleksirintanen/trading-212-veroilmoitus/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/aleksirintanen/trading-212-veroilmoitus/actions/workflows/deploy-pages.yml)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-2ea44f)](https://aleksirintanen.github.io/trading-212-veroilmoitus/)

Staattinen verkkosovellus Trading 212 -tapahtumien verolaskentaan (FIFO + hankintameno-olettama) ja 9A-liitteen PDF-vientiin.

## Projektirakenne

```
.
├── docs/
│   ├── index.html
│   └── assets/
│       ├── css/
│       │   └── style.css
│       └── js/
│           ├── app-tax-calculation.js  # verolaskenta + taulukon päivitys
│           ├── app-exports.js          # JSON/CSV/PDF-exportit + myyntien toggle
│           ├── app-init.js             # eventit + init
│           ├── core/
│           │   └── core-engine.js      # parserit, FIFO, verologiikka
│           └── ui/
│               ├── preview-ui.js       # CSV-esikatselu + UI-tilat
│               └── pdf-export.js       # 9A PDF -vienti
├── test-data/
│   └── csv/
│       ├── dummy_tapahtumat_t212.csv    # Trading 212 -muotoinen dummy
│       └── dummy_tapahtumat_manual.csv  # manuaalimuotoinen dummy
├── index.html                       # juuren redirect -> docs/
└── README.md
```

## Paikallinen käyttö

1. Avaa projekti VS Codessa.
2. Avaa `docs/index.html` selaimessa tai Live Serverillä.
3. Lataa CSV ja aja laskenta.

## Frontend script load order

`docs/index.html` lataa skriptit tässä järjestyksessä:

1. `assets/js/core/core-engine.js`
2. `assets/js/ui/preview-ui.js`
3. `assets/js/ui/pdf-export.js`
4. `assets/js/app-tax-calculation.js`
5. `assets/js/app-exports.js`
6. `assets/js/app-init.js`

Periaate: `core/*` ensin, sitten `ui/*`, sitten sovelluslogiikka (`app-*`), ja lopuksi init.

Miksi: `app-tax-calculation.js`, `app-exports.js` ja `app-init.js` käyttävät globaaleja rajapintoja (`window.AppCore`, `window.AppPreviewUi`, `window.AppPdfExport`), joten väärä latausjärjestys rikkoo riippuvuudet.

### Nopea sisäinen testaus

Avaa selaimen devtools-konsoli ja aja:

`runInternalTests()`

Funktio tarkistaa mm. FIFO-osamyynnin summat sekä CSV-parserin lainausmerkkitapauksen.

## Automaattiset testit (CI)

Repossa on workflow `.github/workflows/ci-tests.yml`, joka ajaa testit:

- pushissa `main`-haaraan
- kaikissa pull requesteissa

Paikallinen ajo (vaatii Node.js):

`node tests/run-tests.mjs`

## Playwright E2E-testit

Projektissa on myös Playwright-end-to-end testit kansiossa `tests/e2e/`.

Asennus:

`npm install`

Asenna Chromium Playwrightille:

`npx playwright install chromium`

Aja E2E-testit:

`npm run test:e2e`

Tarvittaessa ajettuna näkyvällä selaimella:

`npm run test:e2e:headed`

## Dev Container (Docker)

Projektissa on valmis devcontainer-konfiguraatio:

- `.devcontainer/devcontainer.json`
- `.devcontainer/Dockerfile`

Käyttö VS Codessa:

1. Avaa repo VS Codessa.
2. Komento: `Dev Containers: Reopen in Container`.
3. Aja testit containerissa: `node tests/run-tests.mjs`.

## GitHub Pages deploy (`docs/`-kansiosta)

1. Pushaa repo GitHubiin.
2. Avaa GitHubissa: **Settings** → **Pages**.
3. Valitse **Source**: `Deploy from a branch`.
4. Valitse branch: `main` (tai käyttämäsi branch).
5. Valitse folder: `/docs`.
6. Tallenna ja odota julkaisu (1–2 min).

Sovellus tulee näkyviin osoitteeseen:

`https://<github-käyttäjä>.github.io/<repo-nimi>/`

## Huomio

- `index.html` projektin juuressa on tarkoituksella redirect `docs/`-kansioon.
- Varsinainen julkaistava sovellus on `docs/index.html` + `docs/assets/*`.
- Verovuosikohtaiset verosäännöt (rajat/prosentit) löytyvät taulusta `TAX_RULES_BY_YEAR` tiedostossa `docs/assets/js/core/core-engine.js`.

## GitHub Actions deploy (automaattinen)

Repossa on valmis workflow: `.github/workflows/deploy-pages.yml`.

Käyttöönotto:

1. Avaa GitHubissa: **Settings** → **Pages**.
2. Valitse **Source**: `GitHub Actions`.
3. Pushaa `main`-haaraan.

Tämän jälkeen julkaisu tapahtuu automaattisesti jokaisella `main`-pushilla.