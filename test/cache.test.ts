import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "../src/library/base/cache";

describe("TtlCache", () => {
  it("serves a cached value until it expires, then reloads", async () => {
    let now = 1_000;
    const cache = new TtlCache(100, () => now);
    const loader = vi.fn(async () => `loaded at ${now}`);

    expect(await cache.getOrLoad("k", loader)).toBe("loaded at 1000");
    now = 1_050;
    expect(await cache.getOrLoad("k", loader)).toBe("loaded at 1000");
    expect(loader).toHaveBeenCalledTimes(1);

    now = 1_101;
    expect(await cache.getOrLoad("k", loader)).toBe("loaded at 1101");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    const cache = new TtlCache(1_000);
    let resolve!: (value: string) => void;
    const loader = vi.fn(() => new Promise<string>((r) => (resolve = r)));

    const a = cache.getOrLoad("k", loader);
    const b = cache.getOrLoad("k", loader);
    resolve("value");

    expect(await Promise.all([a, b])).toEqual(["value", "value"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const cache = new TtlCache(1_000);
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce("up");

    await expect(cache.getOrLoad("k", loader)).rejects.toThrow("down");
    expect(await cache.getOrLoad("k", loader)).toBe("up");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("keys entries independently and can be cleared", async () => {
    const cache = new TtlCache(1_000);

    expect(await cache.getOrLoad("a", async () => 1)).toBe(1);
    expect(await cache.getOrLoad("b", async () => 2)).toBe(2);
    expect(await cache.getOrLoad("a", async () => 99)).toBe(1);

    cache.clear();
    expect(await cache.getOrLoad("a", async () => 99)).toBe(99);
  });
});
