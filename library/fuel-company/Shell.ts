import { FuelCompany } from "../base/FuelCompany";

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
}

export class UnknownCityError extends Error {
  constructor(city: string) {
    super(`Unknown city: ${city}`);
    this.name = "UnknownCityError";
  }
}

/**
 * Shell Türkiye publishes its pump prices through the panel embedded in
 * https://www.shell.com.tr/suruculer/shell-yakitlari/akaryakit-pompa-satis-fiyatlari.html
 * (an iframe of https://pompafiyat.turkiyeshell.com/prices). The panel is a
 * React app fed by a public JSON API, so we read that API directly instead of
 * rendering the page in a browser.
 */
class Shell implements FuelCompany {
  private api_url: string = "https://pompafiyat.turkiyeshell.com/api/Public";

  /**
   * Prices are published per county (ilçe), grouped by city (il).
   * `city` may be a city code ("034" or "34") or a city name ("İstanbul").
   * `county` must be a county code ("034004").
   */
  public async getFuelPrices(city?: string, county?: string): Promise<any[]> {
    const params = new URLSearchParams();
    const cityCode = await this.resolveCityCode(city);
    if (cityCode) params.set("citycode", cityCode);
    if (county) params.set("countycode", county);

    const query = params.toString();
    const data = await this.fetchJson<ShellPricesResponse>(
      `/prices${query ? `?${query}` : ""}`
    );
    const products = this.parseProducts(data.products);

    return data.groups.map((group) => ({
      cityCode: group.cityCode,
      city: group.cityName,
      counties: group.counties.map((c) => ({
        countyCode: c.countyCode,
        county: c.countyName,
        prices: this.parsePrices(c.prices ?? {}, products),
      })),
    }));
  }

  public async getCities() {
    const cities = await this.fetchJson<ShellCity[]>("/cities");
    return cities.map((c) => ({ cityCode: c.cityCode, city: c.cityName }));
  }

  public async getCounties(city: string) {
    const cityCode = await this.resolveCityCode(city);
    if (!cityCode) throw new UnknownCityError(city);

    const counties = await this.fetchJson<ShellCounty[]>(
      `/counties?citycode=${encodeURIComponent(cityCode)}`
    );
    return counties.map((c) => ({
      countyCode: c.countyCode,
      county: c.countyName,
    }));
  }

  public async getProducts(): Promise<Product[]> {
    const data = await this.fetchJson<ShellPricesResponse>("/prices");
    return this.parseProducts(data.products);
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const response = await fetch(this.api_url + path, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Shell API responded with ${response.status} for ${path}`);
    }
    return (await response.json()) as T;
  }

  /** The API wants zero-padded 3-digit codes; also accept a city name. */
  private async resolveCityCode(city?: string): Promise<string | undefined> {
    if (!city) return undefined;
    if (/^\d+$/.test(city)) return city.padStart(3, "0");

    const wanted = this.normalize(city);
    const match = (await this.getCities()).find(
      (c) => this.normalize(c.city) === wanted
    );
    if (!match) throw new UnknownCityError(city);
    return match.cityCode;
  }

  /** Shell uses ASCII upper-case names ("ISTANBUL", "AGRI"); fold Turkish letters the same way. */
  private normalize(value: string): string {
    const map: Record<string, string> = {
      ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", İ: "I",
      ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U",
    };
    return value
      .trim()
      .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => map[ch])
      .toUpperCase();
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

      return {
        code: p.fepProductCode.trim(),
        name: p.genProductName.trim(),
        description: text.replace(/\s*\([^)]*\)\s*/, " ").trim(),
        unit: unit ? unit[1] : null,
        currency: p.currCode,
      };
    });
  }

  /** Price map is keyed by padded product codes ("37  "); re-key it by product name. */
  private parsePrices(
    prices: Record<string, number>,
    products: Product[]
  ): Record<string, number> {
    const byCode = new Map(products.map((p) => [p.code, p.name]));
    const parsed: Record<string, number> = {};

    for (const [rawCode, price] of Object.entries(prices)) {
      const code = rawCode.trim();
      parsed[byCode.get(code) ?? code] = price;
    }

    return parsed;
  }
}

export default Shell;
