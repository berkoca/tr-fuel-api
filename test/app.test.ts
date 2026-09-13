import { AddressInfo } from "net";
import { Server } from "http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../src/app";
import { fixture, mockFetch } from "./support";

let server: Server;
let base: string;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

function mockUpstreams() {
  mockFetch({
    "petrolofisi.com.tr/akaryakit-fiyatlari": fixture("petrol-ofisi.html"),
    "pompafiyat.turkiyeshell.com/api/Public/cities": fixture("shell-cities.json"),
    "pompafiyat.turkiyeshell.com/api/Public/prices": fixture("shell-prices.json"),
  });
}

async function get(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
}

describe("HTTP API", () => {
  it("serves Petrol Ofisi and Shell prices in the same shape", async () => {
    mockUpstreams();

    const po = await get("/petrol-ofisi/fuel-prices-by-cities?city=Ankara");
    const shell = await get("/shell/fuel-prices-by-cities?city=Ankara");

    expect(po.status).toBe(200);
    expect(shell.status).toBe(200);
    expect(po.body).toHaveLength(1);
    expect(shell.body).toHaveLength(3);
    expect(shell.body.every((r: any) => r.city === "ANKARA")).toBe(true);

    const shape = (row: any) => Object.keys(row).sort();
    expect(shape(po.body[0])).toEqual(shape(shell.body[0]));
    expect(po.body[0].brand).toBe("petrol-ofisi");
    expect(shell.body[0].brand).toBe("shell");
    expect(shell.body[0].prices.benzin.unit).toBe(po.body[0].prices.benzin.unit);
  });

  it("returns 404 for an unknown city on both brands", async () => {
    mockUpstreams();

    expect((await get("/petrol-ofisi/fuel-prices-by-cities?city=Atlantis")).status).toBe(404);
    expect((await get("/shell/fuel-prices-by-cities?city=Atlantis")).status).toBe(404);
  });

  it("returns 400 when /shell/counties is called without a city", async () => {
    const res = await get("/shell/counties");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/city/);
  });

  it("returns 500 with the upstream error message when a source is down", async () => {
    mockFetch({ "petrolofisi.com.tr": { status: 503 } });

    const res = await get("/petrol-ofisi/cities");

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/503/);
  });
});
