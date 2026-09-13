# tr-fuel-api

REST API that serves current fuel pump prices in Turkey, collected from the fuel companies'
public web sites and normalized into one brand-independent format.

Supported brands:

| Brand        | Source                                                                                                                                                 | Granularity   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Petrol Ofisi | [petrolofisi.com.tr/akaryakit-fiyatlari](https://www.petrolofisi.com.tr/akaryakit-fiyatlari) (server-rendered HTML)                                    | city          |
| Shell        | [shell.com.tr pump prices](https://www.shell.com.tr/suruculer/shell-yakitlari/akaryakit-pompa-satis-fiyatlari.html) (public JSON API behind the panel) | city + county |

This is an unofficial project. Prices are scraped from public pages and may lag behind or break
when the sources change their markup.

## Requirements

Node.js 18 or newer (uses the global `fetch` and `AbortSignal.timeout`). No browser or headless
Chrome is needed.

## Getting started

```bash
npm install
npm run dev          # ts-node, listens on http://localhost:3002
```

For production:

```bash
npm run build        # compiles src/ to dist/
npm start            # node dist/index.js
```

## Endpoints

| Method | Path                                  | Query                            | Description                                        |
| ------ | ------------------------------------- | -------------------------------- | -------------------------------------------------- |
| GET    | `/petrol-ofisi/fuel-prices-by-cities` | `city` (optional)                | Prices per city (İstanbul is split Avrupa/Anadolu) |
| GET    | `/petrol-ofisi/cities`                |                                  | Cities with plate codes                            |
| GET    | `/shell/fuel-prices-by-cities`        | `city`, `county` (both optional) | Prices per county, grouped by city                 |
| GET    | `/shell/cities`                       |                                  | Cities with codes                                  |
| GET    | `/shell/counties`                     | `city` (required)                | Counties of a city                                 |
| GET    | `/shell/products`                     |                                  | Shell's product list with fuel-type mapping        |

`city` accepts either a code (`34`, `034`) or a name (`İstanbul`, `istanbul`, `ISTANBUL`; Turkish
letters are folded). `county` must be a Shell county code, e.g. `034004`.

### Response shape

Every price endpoint returns an array of rows with the same shape, regardless of brand:

```json
[
  {
    "brand": "shell",
    "cityCode": "006",
    "city": "ANKARA",
    "countyCode": "006018",
    "county": "ALTINDAG",
    "prices": {
      "benzin": {
        "price": 81.21,
        "unit": "TL/LT",
        "currency": "TRY",
        "productName": "K.Benzin 95 Oktan Shell V-Power"
      },
      "dizel": {
        "price": 90.1,
        "unit": "TL/LT",
        "currency": "TRY",
        "productName": "Motorin Shell V-Power Diesel"
      },
      "lpg": {
        "price": 35.25,
        "unit": "TL/LT",
        "currency": "TRY",
        "productName": "Otogaz Shell Autogas LPG"
      }
    }
  }
]
```

`countyCode` and `county` are `null` for brands that publish city-level prices (Petrol Ofisi).
`productName` keeps the brand's own name for the product.

Fuel types (`prices` keys):

| Key                     | Meaning                                 | Petrol Ofisi | Shell |
| ----------------------- | --------------------------------------- | :----------: | :---: |
| `benzin`                | Unleaded 95 gasoline                    |      ✓       |   ✓   |
| `dizel`                 | Diesel                                  |      ✓       |   ✓   |
| `lpg`                   | Autogas / LPG                           |      ✓       |   ✓   |
| `gazYagi`               | Kerosene (gaz yağı)                     |      ✓       |   ✓   |
| `kaloriferYakiti`       | Heating oil (kalorifer yakıtı / kalyak) |      ✓       |   ✓   |
| `fuelOil`               | Fuel oil                                |      ✓       |   ✓   |
| `yuksekKukurtluFuelOil` | High-sulphur fuel oil                   |              |   ✓   |

A key is omitted when the source has no price for that product at that location.

### Errors

| Status | When                                            |
| ------ | ----------------------------------------------- |
| 400    | A required query parameter is missing           |
| 404    | The requested city is unknown                   |
| 500    | The upstream site failed, timed out, or changed |

The body is always `{ "message": "..." }`.

## Configuration

| Variable           | Default  | Description                                       |
| ------------------ | -------- | ------------------------------------------------- |
| `PORT`             | `3002`   | HTTP port                                         |
| `CACHE_TTL_MS`     | `600000` | How long upstream responses are cached (10 min)   |
| `FETCH_TIMEOUT_MS` | `10000`  | Timeout for requests to the fuel companies' sites |

Upstream responses are cached in memory per URL. Concurrent requests share a single upstream call
and failures are never cached.

## Scripts

| Script                 | Description                                   |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Run from TypeScript with ts-node              |
| `npm run build`        | Compile `src/` to `dist/`                     |
| `npm start`            | Run the compiled server                       |
| `npm test`             | Run the test suite (offline, fixtures-based)  |
| `npm run test:watch`   | Tests in watch mode                           |
| `npm run typecheck`    | Type-check sources and tests without emitting |
| `npm run format`       | Format with Prettier                          |
| `npm run format:check` | Verify formatting                             |

## Project layout

```
src/
  index.ts                     starts the HTTP server
  app.ts                       express app (routes + middleware)
  routes/                      one router per brand
  controllers/                 shared request handlers + brand-specific extras
  library/
    base/
      fuel-company.ts          FuelCompany interface and the unified types
      helpers.ts               fuel classification, Turkish text folding, parsing
      http.ts                  fetch with timeout + cached variants
      cache.ts                 in-memory TTL cache
    fuel-company/
      petrol-ofisi.ts          HTML scraper
      shell.ts                 JSON API client
test/
  *.test.ts                    vitest suites
  fixtures/                    trimmed copies of the real upstream responses
```

## Adding a brand

1. Create `src/library/fuel-company/<brand>.ts` implementing `FuelCompany` from
   `library/base/fuel-company.ts`. Fetch with `cachedText` / `cachedJson` from `library/base/http.ts`
   so the cache and timeout apply, and map product names with `classifyFuel` so the output uses
   the shared fuel types.
2. Add `src/controllers/<brand>.ts` using `fuelPricesHandler` and `citiesHandler` from
   `controllers/fuel-company.ts`, and a router in `src/routes/<brand>.ts`.
3. Mount the router in `src/routes/index.ts`.
4. Save a trimmed copy of the upstream response under `test/fixtures/` and add a test that
   asserts the parsed rows, so future markup changes are caught.
