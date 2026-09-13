import {
  City,
  FuelCompany,
  FuelPrice,
  FuelPriceEntry,
  FuelType,
  PriceFilter,
  UnknownCityError,
} from "../base/FuelCompany";
import { classifyFuel, normalizeText, normalizeUnit } from "../base/helpers";
import { cachedJson } from "../base/http";

interface ShellProduct {
  fepProductCode: string;
  fepProductName: string;
  webProductName: string;
  genProductName: string;
  currCode: string;
  productSeqHistory: number;
}

interface ShellCity {
  cityCode: string;
  cityName: string;
}

interface ShellCounty {
  countyCode: string;
  countyName: string;
  prices?: Record<string, number>;
}

interface ShellCityGroup extends ShellCity {
  counties: ShellCounty[];
}

interface ShellPricesResponse {
  products: ShellProduct[];
  groups: ShellCityGroup[];
}

export interface Product {
  code: string;
  name: string;
  description: string;
  unit: string | null;
  currency: string;
  fuelType: FuelType | null;
}

export interface County {
  code: string;
  name: string;
}

/**
 * Shell Türkiye publishes its pump prices through the panel embedded in
 * https://www.shell.com.tr/suruculer/shell-yakitlari/akaryakit-pompa-satis-fiyatlari.html
 * (an iframe of https://pompafiyat.turkiyeshell.com/prices). The panel is a
 * React app fed by a public JSON API, so we read that API directly.
 *
 * Prices are published per county (ilçe), grouped by city (il). The full
 * price list is fetched once and cached; filtering happens locally so every
 * request shares the same cache entry.
 */
class Shell implements FuelCompany {
  public readonly brand = "shell";
  private api_url: string = "https://pompafiyat.turkiyeshell.com/api/Public";

  public async getFuelPrices(filter: PriceFilter = {}): Promise<FuelPriceEntry[]> {
    const cityCode = await this.resolveCityCode(filter.city);
    const data = await this.fetchJson<ShellPricesResponse>("/prices");
    const products = this.parseProducts(data.products);

    const entries: FuelPriceEntry[] = [];
    for (const group of data.groups) {
      if (cityCode && group.cityCode !== cityCode) continue;

      for (const county of group.counties) {
        if (filter.county && county.countyCode !== filter.county) continue;

        entries.push({
          brand: this.brand,
          cityCode: group.cityCode,
          city: group.cityName,
          countyCode: county.countyCode,
          county: county.countyName,
          prices: this.parsePrices(county.prices ?? {}, products),
        });
      }
    }
    return entries;
  }

  public async getCities(): Promise<City[]> {
    const cities = await this.fetchJson<ShellCity[]>("/cities");
    return cities.map((c) => ({ code: c.cityCode, name: c.cityName }));
  }

  public async getCounties(city: string): Promise<County[]> {
    const cityCode = await this.resolveCityCode(city);
    if (!cityCode) throw new UnknownCityError(city);

    const counties = await this.fetchJson<ShellCounty[]>(
      `/counties?citycode=${encodeURIComponent(cityCode)}`
    );
    return counties.map((c) => ({ code: c.countyCode, name: c.countyName }));
  }

  public async getProducts(): Promise<Product[]> {
    const data = await this.fetchJson<ShellPricesResponse>("/prices");
    return this.parseProducts(data.products);
  }

  private fetchJson<T>(path: string): Promise<T> {
    return cachedJson<T>(this.api_url + path);
  }

  /** The API uses zero-padded 3-digit codes; also accept a city name. */
  private async resolveCityCode(city?: string): Promise<string | undefined> {
    if (!city) return undefined;
    if (/^\d+$/.test(city)) return city.padStart(3, "0");

    const wanted = normalizeText(city);
    const match = (await this.getCities()).find((c) => normalizeText(c.name) === wanted);
    if (!match || !match.code) throw new UnknownCityError(city);
    return match.code;
  }

  private parseProducts(products: ShellProduct[]): Product[] {
    return products.map((p) => {
      // webProductName is an HTML fragment such as
      // "K.Benzin&nbsp;95&nbsp;Oktan</br>(TL/Lt)&nbsp;</br>Shell&nbsp;V-Power&nbsp;"
      const text = p.webProductName
        .replace(/&nbsp;/g, " ")
        .replace(/<\/?br\s*\/?>/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      const unit = text.match(/\(([^)]+)\)/);
      const description = text.replace(/\s*\([^)]*\)\s*/, " ").trim();

      return {
        code: p.fepProductCode.trim(),
        name: p.genProductName.trim(),
        description,
        unit: unit ? normalizeUnit(unit[1]) : null,
        currency: p.currCode,
        fuelType: classifyFuel(description) ?? classifyFuel(p.genProductName),
      };
    });
  }

  /** Price map is keyed by padded product codes ("37  "); re-key it by fuel type. */
  private parsePrices(
    prices: Record<string, number>,
    products: Product[]
  ): Partial<Record<FuelType, FuelPrice>> {
    const byCode = new Map(products.map((p) => [p.code, p]));
    const parsed: Partial<Record<FuelType, FuelPrice>> = {};

    for (const [rawCode, price] of Object.entries(prices)) {
      const product = byCode.get(rawCode.trim());
      if (!product || !product.fuelType) continue;

      parsed[product.fuelType] = {
        price,
        unit: product.unit ?? "",
        currency: product.currency,
        productName: product.description,
      };
    }

    return parsed;
  }
}

export default Shell;
