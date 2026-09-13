import {
  City,
  FuelCompany,
  FuelPrice,
  FuelPriceEntry,
  FuelType,
  PriceFilter,
  UnknownCityError,
} from "../base/fuel-company";
import {
  cityMatches,
  classifyFuel,
  decodeHtml,
  htmlToLines,
  parsePriceText,
} from "../base/helpers";
import { cachedText } from "../base/http";

/**
 * Petrol Ofisi renders its city price list server-side at
 * https://www.petrolofisi.com.tr/akaryakit-fiyatlari, so a plain HTTP GET and a
 * bit of HTML parsing is enough; no browser is needed.
 *
 * Each city is a `<li class="list-group-item p-3" data-district-id="03431">`
 * whose text is the city name followed by alternating product-name / price
 * elements. The set of products changes over time, so labels are paired with
 * values dynamically and then classified into brand-independent fuel types.
 */
class PetrolOfisi implements FuelCompany {
  public readonly brand = "petrol-ofisi";
  private fuel_url: string = "https://www.petrolofisi.com.tr/akaryakit-fiyatlari";

  public async getFuelPrices(filter: PriceFilter = {}): Promise<FuelPriceEntry[]> {
    const html = await this.fetchHtml();
    const entries = this.parseFuelData(html);

    if (!filter.city) return entries;

    const wanted = filter.city;
    const matched = entries.filter((e) => cityMatches(wanted, e.cityCode, e.city));
    if (matched.length === 0) throw new UnknownCityError(wanted);
    return matched;
  }

  public async getCities(): Promise<City[]> {
    const html = await this.fetchHtml();
    return this.parseCities(html);
  }

  private fetchHtml(): Promise<string> {
    return cachedText(this.fuel_url);
  }

  private parseFuelData(html: string): FuelPriceEntry[] {
    const itemPattern = /<li\s+class="list-group-item p-3"([^>]*)>([\s\S]*?)<\/li>/g;
    const entries: FuelPriceEntry[] = [];

    for (const match of html.matchAll(itemPattern)) {
      const attributes = match[1];
      const lines = htmlToLines(match[2]);
      if (lines.length === 0) continue;

      const districtId = attributes.match(/data-district-id="(\d+)"/)?.[1] ?? null;
      const prices: Partial<Record<FuelType, FuelPrice>> = {};

      for (let i = 1; i + 1 < lines.length; i += 2) {
        const productName = lines[i];
        const parsed = parsePriceText(lines[i + 1]);
        const fuelType = classifyFuel(productName);
        if (!parsed || !fuelType) continue;

        prices[fuelType] = {
          price: parsed.price,
          unit: parsed.unit,
          currency: "TRY",
          productName,
        };
      }

      entries.push({
        brand: this.brand,
        // district ids look like "03431": 3-digit city code + 2-digit district.
        cityCode: districtId ? districtId.slice(0, 3) : null,
        city: lines[0],
        countyCode: null,
        county: null,
        prices,
      });
    }

    if (entries.length === 0) {
      throw new Error(
        "Could not find any price rows on the Petrol Ofisi page; the markup may have changed."
      );
    }

    return entries;
  }

  private parseCities(html: string): City[] {
    const select = html.match(/<select[^>]*cities-dropdown[^>]*>([\s\S]*?)<\/select>/);
    if (!select) {
      throw new Error(
        "Could not find the city dropdown on the Petrol Ofisi page; the markup may have changed."
      );
    }

    const cities: City[] = [];
    for (const option of select[1].matchAll(/<option\s+value="(\d+)"[^>]*>([^<]*)<\/option>/g)) {
      cities.push({
        code: option[1].padStart(3, "0"),
        name: decodeHtml(option[2]).trim(),
      });
    }
    return cities;
  }
}

export default PetrolOfisi;
