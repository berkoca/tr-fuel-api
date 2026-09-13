import { readFileSync } from "fs";
import { join } from "path";
import { vi } from "vitest";

export function fixture(name: string): string {
  return readFileSync(join(__dirname, "fixtures", name), "utf-8");
}

type Reply = string | { status: number; body?: string };

/**
 * Replace global fetch with a stub that answers by URL substring.
 * Anything not matched falls through to the real fetch, so tests can still
 * talk to a local express server.
 */
export function mockFetch(routes: Record<string, Reply>) {
  const realFetch = globalThis.fetch;
  const stub = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    for (const [needle, reply] of Object.entries(routes)) {
      if (!url.includes(needle)) continue;
      if (typeof reply === "string") return new Response(reply, { status: 200 });
      return new Response(reply.body ?? "", { status: reply.status });
    }

    return realFetch(input, init);
  });

  vi.stubGlobal("fetch", stub);
  return stub;
}

export function calledUrls(stub: ReturnType<typeof mockFetch>): string[] {
  return stub.mock.calls.map(([input]) => String(input instanceof Request ? input.url : input));
}
