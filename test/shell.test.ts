import { describe, expect, it } from "vitest";
import Shell from "../src/library/fuel-company/shell";
import { UnknownCityError } from "../src/library/base/fuel-company";
import { calledUrls, fixture, mockFetch } from "./support";

const API = "pompafiyat.turkiyeshell.com/api/Public";

function mockShell(extra: Record<string, { status: number; body?: string }> = {}) {
  return mockFetch({
    ...extra,
    [`${API}/cities`]: fixture("shell-cities.json"),
    [`${API}/counties`]: JSON.stringify([
      { countyCode: "006018", countyName: "ALTINDAG" },
      { countyCode: "006004", countyName: "BEYPAZARI" },
    ]),
    [`${API}/prices`]: fixture("shell-prices.json"),
  });
}

describe("Shell.getFuelPrices", () => {
  it("flattens city groups into one row per county in the unified shape", async () => {
    mockShell();

    const rows = await new Shell().getFuelPrices();

    expect(rows).toHaveLength(9);
    expect(rows[0]).toEqual({
      brand: "shell",
      cityCode: "001",
      city: "ADANA",
      countyCode: "001002",
      county: "ALADAG",
      prices: {
        benzin: {
          price: 82.06,
          unit: "TL/LT",
          currency: "TRY",
          productName: "K.Benzin 95 Oktan Shell V-Power",
        },
        dizel: {
          price: 90.94,
          unit: "TL/LT",
          currency: "TRY",
          productName: "Motorin Shell V-Power Diesel",
        },
        lpg: {
          price: 35.79,
          unit: "TL/LT",
          currency: "TRY",
          productName: "Otogaz Shell Autogas LPG",
        },
        gazYagi: { price: 102.09, unit: "TL/LT", currency: "TRY", productName: "Gaz Yagı" },
        kaloriferYakiti: { price: 72.9, unit: "TL/KG", currency: "TRY", productName: "Kalyak" },
        yuksekKukurtluFuelOil: {
          price: 45.56,
          unit: "TL/KG",
          currency: "TRY",
          productName: "Yüksek Kükürtlü Fuel Oil",
        },
        fuelOil: { price: 51.3, unit: "TL/KG", currency: "TRY", productName: "Fuel Oil" },
      },
    });
  });

  it("only includes products the county actually has a price for", async () => {
    mockShell();

    const rows = await new Shell().getFuelPrices();
    const cukurova = rows.find((r) => r.county === "CUKUROVA");

    expect(cukurova).toBeDefined();
    expect(Object.keys(cukurova!.prices).sort()).toEqual(["benzin", "dizel"]);
  });

  it("filters locally by zero-padded city code and county code", async () => {
    const stub = mockShell();

    const rows = await new Shell().getFuelPrices({ city: "6", county: "006018" });

    expect(rows.map((r) => [r.cityCode, r.county])).toEqual([["006", "ALTINDAG"]]);
    expect(calledUrls(stub)).toEqual([`https://${API}/prices`]);
  });

  it("resolves a city name via the cities endpoint, then filters locally", async () => {
    const stub = mockShell();

    const rows = await new Shell().getFuelPrices({ city: "İstanbul" });

    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.cityCode === "034")).toBe(true);
    expect(calledUrls(stub)).toEqual([`https://${API}/cities`, `https://${API}/prices`]);
  });

  it("serves repeated calls from the upstream cache", async () => {
    const stub = mockShell();
    const shell = new Shell();

    await shell.getFuelPrices();
    await shell.getFuelPrices({ city: "1" });
    await shell.getProducts();

    expect(calledUrls(stub)).toEqual([`https://${API}/prices`]);
  });

  it("throws UnknownCityError for an unknown city name", async () => {
    mockShell();

    await expect(new Shell().getFuelPrices({ city: "Atlantis" })).rejects.toBeInstanceOf(
      UnknownCityError
    );
  });

  it("fails on non-2xx responses", async () => {
    mockFetch({ [`${API}/prices`]: { status: 500, body: "boom" } });

    await expect(new Shell().getFuelPrices()).rejects.toThrow(/500/);
  });
});

describe("Shell.getCities / getCounties / getProducts", () => {
  it("returns cities as code/name pairs", async () => {
    mockShell();

    const cities = await new Shell().getCities();

    expect(cities).toHaveLength(81);
    expect(cities[0]).toEqual({ code: "001", name: "ADANA" });
  });

  it("returns counties for a city given by name", async () => {
    const stub = mockShell();

    const counties = await new Shell().getCounties("Ankara");

    expect(counties).toEqual([
      { code: "006018", name: "ALTINDAG" },
      { code: "006004", name: "BEYPAZARI" },
    ]);
    expect(calledUrls(stub)[1]).toBe(`https://${API}/counties?citycode=006`);
  });

  it("cleans product HTML and classifies every product", async () => {
    mockShell();

    const products = await new Shell().getProducts();

    expect(products.map((p) => [p.code, p.name, p.fuelType, p.unit])).toEqual([
      ["37", "V-Power", "benzin", "TL/LT"],
      ["34", "VP Diesel", "dizel", "TL/LT"],
      ["71", "Gaz Yagi", "gazYagi", "TL/LT"],
      ["72", "Kalyak", "kaloriferYakiti", "TL/KG"],
      ["73", "FO6", "yuksekKukurtluFuelOil", "TL/KG"],
      ["75", "FO5", "fuelOil", "TL/KG"],
      ["5", "LPG", "lpg", "TL/LT"],
    ]);
    expect(products[0].description).toBe("K.Benzin 95 Oktan Shell V-Power");
  });
});
