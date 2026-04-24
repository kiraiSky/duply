import { request } from "undici";

export type PipedriveConfig = {
  apiToken: string;
  domain: string; // ex: "minhaempresa" → minhaempresa.pipedrive.com
};

type Query = Record<string, string | number | boolean | undefined>;

export class PipedriveClient {
  constructor(private cfg: PipedriveConfig) {}

  private url(path: string, query: Query = {}) {
    const qs = new URLSearchParams({ api_token: this.cfg.apiToken });
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    return `https://${this.cfg.domain}.pipedrive.com/api/v1${path}?${qs}`;
  }

  async get<T>(path: string, query: Query = {}): Promise<T> {
    return this.call<T>("GET", path, query);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.call<T>("POST", path, {}, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.call<T>("PUT", path, {}, body);
  }

  private async call<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    query: Query,
    body?: unknown,
  ): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await request(this.url(path, query), {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.statusCode === 429) {
        const reset = Number(res.headers["x-ratelimit-reset"] ?? 2);
        await sleep(reset * 1000);
        continue;
      }

      const json = (await res.body.json()) as {
        success: boolean;
        data: T;
        error?: string;
      };

      if (res.statusCode >= 400 || !json.success) {
        throw new Error(
          `Pipedrive ${method} ${path} failed (${res.statusCode}): ${json.error ?? "unknown"}`,
        );
      }

      return json.data;
    }
    throw new Error(`Pipedrive ${method} ${path}: rate-limited after retries`);
  }

  /** Pagina via start/limit até esgotar. */
  async *paginate<T>(path: string, query: Query = {}, limit = 100): AsyncGenerator<T> {
    let start = 0;
    while (true) {
      const res = await request(this.url(path, { ...query, start, limit }));
      const json = (await res.body.json()) as {
        success: boolean;
        data: T[] | null;
        additional_data?: { pagination?: { more_items_in_collection: boolean; next_start?: number } };
      };
      if (!json.success) throw new Error(`paginate ${path} failed`);
      for (const item of json.data ?? []) yield item;
      const pag = json.additional_data?.pagination;
      if (!pag?.more_items_in_collection) return;
      start = pag.next_start ?? start + limit;
    }
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
