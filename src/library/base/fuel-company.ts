/**
 * Brand-independent fuel categories. Every brand maps its own product names
 * onto these keys so API consumers get the same shape regardless of source.
 */
export type FuelType =
  "benzin" | "dizel" | "gazYagi" | "lpg" | "kaloriferYakiti" | "fuelOil" | "yuksekKukurtluFuelOil";

export const FUEL_TYPES: FuelType[] = [
  "benzin",
  "dizel",
  "gazYagi",
  "lpg",
  "kaloriferYakiti",
  "fuelOil",
  "yuksekKukurtluFuelOil",
];

export interface FuelPrice {
  price: number;
  /** "TL/LT" or "TL/KG" */
  unit: string;
  currency: string;
  /** The brand's own product name, e.g. "V/Max Kurşunsuz 95" or "Shell V-Power". */
  productName: string;
}

export interface FuelPriceEntry {
  brand: string;
  cityCode: string | null;
  city: string;
  /** Some brands (Shell) publish prices per county; others (Petrol Ofisi) per city. */
  countyCode: string | null;
  county: string | null;
  prices: Partial<Record<FuelType, FuelPrice>>;
}

export interface City {
  code: string | null;
  name: string;
}

export interface PriceFilter {
  /** City code ("034", "34") or name ("İstanbul"). */
  city?: string;
  /** County code, only meaningful for brands with county-level prices. */
  county?: string;
}

export interface FuelCompany {
  readonly brand: string;
  getFuelPrices(filter?: PriceFilter): Promise<FuelPriceEntry[]>;
  getCities(): Promise<City[]>;
}

export class UnknownCityError extends Error {
  constructor(city: string) {
    super(`Unknown city: ${city}`);
    this.name = "UnknownCityError";
  }
}
