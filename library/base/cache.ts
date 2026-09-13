interface Entry {
  value: unknown;
  expiresAt: number;
}

/**
 * Minimal in-memory TTL cache. Concurrent loads of the same key share one
 * in-flight promise, and failed loads are not cached.
 */
export class TtlCache {
  private entries = new Map<string, Entry>();
  private inFlight = new Map<string, Promise<unknown>>();

  constructor(private ttlMs: number, private now: () => number = Date.now) {}

  async getOrLoad<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > this.now()) {
      return cached.value as T;
    }

    const pending = this.inFlight.get(key);
    if (pending) return pending as Promise<T>;

    const load = loader()
      .then((value) => {
        this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
        return value;
      })
      .finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, load);
    return load;
  }

  clear(): void {
    this.entries.clear();
    this.inFlight.clear();
  }
}

/** Fuel prices change at most a few times a day; 10 minutes is plenty. */
export const DEFAULT_CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 10 * 60 * 1000;

/** Shared cache for upstream (Petrol Ofisi / Shell) responses. */
export const upstreamCache = new TtlCache(DEFAULT_CACHE_TTL_MS);
