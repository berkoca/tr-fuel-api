import { describe, expect, it } from "vitest";
import {
  cityMatches,
  classifyFuel,
  decodeHtml,
  htmlToLines,
  normalizeText,
  normalizeUnit,
  parsePriceText,
} from "../src/library/base/helpers";

describe("normalizeText", () => {
  it("folds Turkish letters and upper-cases", () => {
    expect(normalizeText("İstanbul")).toBe("ISTANBUL");
    expect(normalizeText("Şanlıurfa")).toBe("SANLIURFA");
    expect(normalizeText("Ağrı")).toBe("AGRI");
    expect(normalizeText("  Çorum \n Merkez ")).toBe("CORUM MERKEZ");
  });
});

describe("classifyFuel", () => {
  it.each([
    // Petrol Ofisi labels
    ["V/Max Kurşunsuz 95", "benzin"],
    ["V/Max Diesel", "dizel"],
    ["Gazyağı", "gazYagi"],
    ["Kalorifer Yakıtı", "kaloriferYakiti"],
    ["Fuel Oil", "fuelOil"],
    ["PO/gaz Otogaz", "lpg"],
    // Shell descriptions
    ["K.Benzin 95 Oktan Shell V-Power", "benzin"],
    ["Motorin Shell V-Power Diesel", "dizel"],
    ["Gaz Yagı", "gazYagi"],
    ["Kalyak", "kaloriferYakiti"],
    ["Yüksek Kükürtlü Fuel Oil", "yuksekKukurtluFuelOil"],
    ["Otogaz Shell Autogas LPG", "lpg"],
    // Shell short codes
    ["FO5", "fuelOil"],
    ["LPG", "lpg"],
  ])("maps %s to %s", (name, expected) => {
    expect(classifyFuel(name)).toBe(expected);
  });

  it("returns null for unknown products", () => {
    expect(classifyFuel("AdBlue")).toBeNull();
    expect(classifyFuel("")).toBeNull();
  });
});

describe("parsePriceText", () => {
  it("parses price and unit", () => {
    expect(parsePriceText("80.26 TL/LT")).toEqual({ price: 80.26, unit: "TL/LT" });
    expect(parsePriceText("69.06 TL/KG")).toEqual({ price: 69.06, unit: "TL/KG" });
  });

  it("accepts comma decimals, thousands separators and mixed-case units", () => {
    expect(parsePriceText("34,99 TL/Lt")).toEqual({ price: 34.99, unit: "TL/LT" });
    expect(parsePriceText("1.234,56 TL / Kg")).toEqual({ price: 1234.56, unit: "TL/KG" });
  });

  it("returns null when there is no number", () => {
    expect(parsePriceText("-")).toBeNull();
    expect(parsePriceText("TL/LT")).toBeNull();
  });
});

describe("normalizeUnit", () => {
  it("upper-cases and strips spaces", () => {
    expect(normalizeUnit("TL/Lt")).toBe("TL/LT");
    expect(normalizeUnit("TL / kg")).toBe("TL/KG");
  });
});

describe("decodeHtml / htmlToLines", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeHtml("Benzin &amp; Motorin &#39;95&#39; &#x26; &nbsp;LPG")).toBe(
      "Benzin & Motorin '95' &  LPG"
    );
  });

  it("turns markup into trimmed non-empty lines", () => {
    const html = `
      ANKARA
      <div class="row">
        <div><div class="label">V/Max Diesel</div>
          90.16 TL/LT
        </div>
      </div>`;
    expect(htmlToLines(html)).toEqual(["ANKARA", "V/Max Diesel", "90.16 TL/LT"]);
  });
});

describe("cityMatches", () => {
  it("matches numeric input against zero-padded codes", () => {
    expect(cityMatches("6", "006", "ANKARA")).toBe(true);
    expect(cityMatches("034", "034", "ISTANBUL (AVRUPA)")).toBe(true);
    expect(cityMatches("34", "006", "ANKARA")).toBe(false);
    expect(cityMatches("34", null, "ISTANBUL")).toBe(false);
  });

  it("matches names ignoring case, Turkish letters and qualifiers", () => {
    expect(cityMatches("İstanbul", "034", "ISTANBUL (AVRUPA)")).toBe(true);
    expect(cityMatches("istanbul", "034", "ISTANBUL (ANADOLU)")).toBe(true);
    expect(cityMatches("Ankara", "034", "ISTANBUL (AVRUPA)")).toBe(false);
  });
});
