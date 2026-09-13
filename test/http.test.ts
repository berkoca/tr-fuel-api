import { describe, expect, it, vi } from "vitest";
import { fetchJson, fetchText } from "../src/library/base/http";
import { mockFetch } from "./support";

describe("fetchText / fetchJson", () => {
  it("sends a browser user agent and the matching Accept header", async () => {
    const stub = mockFetch({ "example.test/page": "<p>hi</p>" });

    expect(await fetchText("https://example.test/page")).toBe("<p>hi</p>");

    const [, init] = stub.mock.calls[0];
    expect((init?.headers as Record<string, string>)["User-Agent"]).toMatch(/Mozilla/);
    expect((init?.headers as Record<string, string>).Accept).toBe("text/html");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("parses JSON", async () => {
    mockFetch({ "example.test/data": JSON.stringify({ ok: true }) });

    expect(await fetchJson<{ ok: boolean }>("https://example.test/data")).toEqual({ ok: true });
  });

  it("throws with the status on non-2xx responses", async () => {
    mockFetch({ "example.test": { status: 502 } });

    await expect(fetchText("https://example.test/x")).rejects.toThrow(/status 502/);
  });

  it("aborts and reports a timeout when the upstream hangs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
          })
      )
    );

    await expect(fetchText("https://example.test/slow", { timeoutMs: 20 })).rejects.toThrow(
      /timed out after 20 ms/
    );
  });
});
