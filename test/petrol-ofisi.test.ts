import { describe, expect, it } from "vitest";
import PetrolOfisi from "../src/library/fuel-company/petrol-ofisi";
import { UnknownCityError } from "../src/library/base/fuel-company";
import { fixture, mockFetch } from "./support";

const PAGE = "petrolofisi.com.tr/akaryakit-fiyatlari";

describe("PetrolOfisi.getFuelPrices", () => {
  it("parses every city row into the unified shape", async () => {
    mockFetch({ [PAGE]: fixture("petrol-ofisi.html") });

    const rows = await new PetrolOfisi().getFuelPrices();

    expect(rows.map((r) => r.city)).toEqual([
      "ISTANBUL (AVRUPA)",
      "ISTANBUL (ANADOLU)",
      "ANKARA",
      "ZONGULDAK",
    ]);
    expect(rows[0]).toEqual({
      brand: "petrol-ofisi",
      cityCode: "034",
      city: "ISTANBUL (AVRUPA)",
      countyCode: null,
      county: null,
      prices: {
        benzin: { price: 80.26, unit: "TL/LT", currency: "TRY", productName: "V/Max Kurşunsuz 95" },
        dizel: { price: 89.01, unit: "TL/LT", currency: "TRY", productName: "V/Max Diesel" },
        gazYagi: { price: 98.66, unit: "TL/LT", currency: "TRY", productName: "Gazyağı" },
        kaloriferYakiti: {
          price: 69.06,
          unit: "TL/KG",
          currency: "TRY",
          productName: "Kalorifer Yakıtı",
        },
        fuelOil: { price: 49.84, unit: "TL/KG", currency: "TRY", productName: "Fuel Oil" },
        lpg: { price: 34.99, unit: "TL/LT", currency: "TRY", productName: "PO/gaz Otogaz" },
      },
    });
    expect(rows[2].cityCode).toBe("006");
  });

  it("filters by city name or code", async () => {
    mockFetch({ [PAGE]: fixture("petrol-ofisi.html") });
    const po = new PetrolOfisi();

    const byName = await po.getFuelPrices({ city: "İstanbul" });
    expect(byName.map((r) => r.city)).toEqual(["ISTANBUL (AVRUPA)", "ISTANBUL (ANADOLU)"]);

    const byCode = await po.getFuelPrices({ city: "6" });
    expect(byCode.map((r) => r.city)).toEqual(["ANKARA"]);
  });

  it("throws UnknownCityError for a city that is not on the page", async () => {
    mockFetch({ [PAGE]: fixture("petrol-ofisi.html") });

    await expect(new PetrolOfisi().getFuelPrices({ city: "Atlantis" })).rejects.toBeInstanceOf(
      UnknownCityError
    );
  });

  it("skips products it cannot classify and prices it cannot parse", async () => {
    const html = `
      <li class="list-group-item p-3" data-district-id="00601">
        ANKARA
        <div><div class="fs-7">V/Max Diesel</div> 90.16 TL/LT</div>
        <div><div class="fs-7">AdBlue</div> 12.00 TL/LT</div>
        <div><div class="fs-7">PO/gaz Otogaz</div> -</div>
      </li>`;
    mockFetch({ [PAGE]: html });

    const [row] = await new PetrolOfisi().getFuelPrices();
    expect(Object.keys(row.prices)).toEqual(["dizel"]);
  });

  it("fails loudly when the markup no longer contains price rows", async () => {
    mockFetch({ [PAGE]: "<html><body><p>Yeni tasarım</p></body></html>" });

    await expect(new PetrolOfisi().getFuelPrices()).rejects.toThrow(/markup may have changed/);
  });

  it("fails on non-2xx responses", async () => {
    mockFetch({ [PAGE]: { status: 503 } });

    await expect(new PetrolOfisi().getFuelPrices()).rejects.toThrow(/503/);
  });

  it("fetches the page once and serves later calls from the cache", async () => {
    const stub = mockFetch({ [PAGE]: fixture("petrol-ofisi.html") });
    const po = new PetrolOfisi();

    await po.getFuelPrices();
    await po.getFuelPrices({ city: "Ankara" });
    await po.getCities();

    expect(stub).toHaveBeenCalledTimes(1);
  });
});

describe("PetrolOfisi.getCities", () => {
  it("reads the city dropdown with zero-padded plate codes", async () => {
    mockFetch({ [PAGE]: fixture("petrol-ofisi.html") });

    const cities = await new PetrolOfisi().getCities();

    expect(cities).toEqual([
      { code: "034", name: "İstanbul" },
      { code: "006", name: "Ankara" },
      { code: "035", name: "İzmir" },
      { code: "001", name: "Adana" },
      { code: "002", name: "Adıyaman" },
    ]);
  });

  it("fails loudly when the dropdown is missing", async () => {
    mockFetch({ [PAGE]: "<html><body></body></html>" });

    await expect(new PetrolOfisi().getCities()).rejects.toThrow(/markup may have changed/);
  });
});
