import { FuelType } from "./fuel-company";

const TURKISH_MAP: Record<string, string> = {
  ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", İ: "I",
  ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U",
};

/** Fold Turkish letters to ASCII, upper-case and collapse whitespace, for comparisons. */
export function normalizeText(value: string): string {
  return value
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TURKISH_MAP[ch])
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Map a brand's product name onto a brand-independent fuel type. */
export function classifyFuel(productName: string): FuelType | null {
  const name = normalizeText(productName).toLowerCase();

  if (/lpg|otogaz|autogas/.test(name)) return "lpg";
  if (/yuksek kukurt/.test(name)) return "yuksekKukurtluFuelOil";
  if (/fuel ?oil|\bfo\d?\b/.test(name)) return "fuelOil";
  if (/kalorifer|kalyak/.test(name)) return "kaloriferYakiti";
  if (/gaz ?yag|kerosen/.test(name)) return "gazYagi";
  if (/diesel|dizel|motorin/.test(name)) return "dizel";
  if (/benzin|kursunsuz|oktan/.test(name)) return "benzin";

  return null;
}

/** Parse "80.26 TL/LT" (or "80,26 TL/Lt") into a number and a normalized unit. */
export function parsePriceText(text: string): { price: number; unit: string } | null {
  const match = text.trim().match(/^([\d.,]+)\s*([A-Za-z]+\s*\/\s*[A-Za-z]+)?/);
  if (!match) return null;

  const price = parseFloat(match[1].replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  if (Number.isNaN(price)) return null;

  return {
    price,
    unit: match[2] ? match[2].replace(/\s+/g, "").toUpperCase() : "",
  };
}

/** Normalize "TL/Lt" / "TL/lt" / "TL/Kg" to "TL/LT" / "TL/KG". */
export function normalizeUnit(unit: string): string {
  return unit.replace(/\s+/g, "").toUpperCase();
}

/** Turn an HTML fragment into plain-text lines (roughly what innerText gives). */
export function htmlToLines(html: string): string[] {
  return decodeHtml(html.replace(/<[^>]+>/g, "\n"))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0);
}

export function decodeHtml(text: string): string {
  const named: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x"
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    }
    return named[entity.toLowerCase()] ?? whole;
  });
}

/** Match a user-supplied city (code or name) against a city code and name. */
export function cityMatches(
  wanted: string,
  cityCode: string | null,
  cityName: string
): boolean {
  const input = wanted.trim();
  if (/^\d+$/.test(input)) {
    return cityCode !== null && cityCode.padStart(3, "0") === input.padStart(3, "0");
  }
  // Ignore qualifiers such as "ISTANBUL (AVRUPA)".
  const bareName = normalizeText(cityName.replace(/\(.*?\)/g, ""));
  return bareName === normalizeText(input);
}
