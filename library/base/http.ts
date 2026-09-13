import { upstreamCache } from "./cache";

export const DEFAULT_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 10_000;

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

export interface RequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

/** GET a URL with a timeout; throws on timeout or non-2xx status. */
export async function fetchResponse(url: string, options: RequestOptions = {}): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT, ...options.headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if ((error as Error).name === "TimeoutError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs} ms`);
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  return response;
}

export async function fetchText(url: string, options: RequestOptions = {}): Promise<string> {
  const response = await fetchResponse(url, { ...options, headers: { Accept: "text/html", ...options.headers } });
  return await response.text();
}

export async function fetchJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetchResponse(url, { ...options, headers: { Accept: "application/json", ...options.headers } });
  return (await response.json()) as T;
}

/** Same as fetchText / fetchJson, but served from the shared upstream cache when fresh. */
export function cachedText(url: string, options?: RequestOptions): Promise<string> {
  return upstreamCache.getOrLoad(url, () => fetchText(url, options));
}

export function cachedJson<T>(url: string, options?: RequestOptions): Promise<T> {
  return upstreamCache.getOrLoad(url, () => fetchJson<T>(url, options));
}
