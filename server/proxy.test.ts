import { afterEach, describe, it, expect, vi } from "vitest";
import { Readable } from "node:stream";
import handler from "../api/proxy.js";
type Request = Parameters<typeof handler>[0];
type Response = Parameters<typeof handler>[1];
function response() {
  const headers = new Map<string, unknown>();
  const result = {
    statusCode: 200,
    body: "",
    setHeader: (key: string, value: unknown) => {
      headers.set(key.toLowerCase(), value);
    },
    end: (body: unknown) => {
      result.body = String(body || "");
    },
  };
  return { result, headers, res: result as unknown as Response };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("proxy de autenticação na Vercel", () => {
  it("explica a configuração ausente sem expor dados internos", async () => {
    vi.stubEnv("API_PROXY_TARGET", "");
    const { result, res } = response();
    await handler({} as Request, res);
    expect(result.statusCode).toBe(503);
    expect(JSON.parse(result.body).message).toContain("API_PROXY_TARGET");
  });
  it("mantém os cookies HttpOnly na origem do frontend", async () => {
    vi.stubEnv("API_PROXY_TARGET", "https://tabi-api.example");
    const upstream = new Response(JSON.stringify({ user: { name: "Teste" } }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie":
          "__Host-tabi=opaque; Path=/; Secure; HttpOnly; SameSite=Lax",
      },
    });
    const fetcher = vi.fn().mockResolvedValue(upstream);
    vi.stubGlobal("fetch", fetcher);
    const req = Object.assign(Readable.from([]), {
      url: "/api/proxy?__tabi_path=auth/login",
      method: "POST",
      headers: {
        origin: "https://tabi.example",
        cookie: "__Host-tabi=previous",
        "content-type": "application/json",
        "x-tabi-request": "1",
      },
      body: { email: "test@example.test", password: "senha de teste" },
    }) as unknown as Request;
    const { result, res, headers } = response();
    await handler(req, res);
    expect(result.statusCode).toBe(200);
    expect(headers.get("set-cookie")).toEqual([
      "__Host-tabi=opaque; Path=/; Secure; HttpOnly; SameSite=Lax",
    ]);
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).toBe("https://tabi-api.example/api/auth/login");
    expect(options.headers.get("cookie")).toBe("__Host-tabi=previous");
    expect(options.headers.get("x-tabi-request")).toBe("1");
    expect(options.redirect).toBe("manual");
  });
  it.each([
    "health",
    "auth/me",
    "destinations/countries",
    "trips/507f1f77bcf86cd799439011",
  ])("encaminha a rota completa %s e preserva a consulta", async (path) => {
    vi.stubEnv("API_PROXY_TARGET", "https://tabi-api.example");
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true })),
    );
    vi.stubGlobal("fetch", fetcher);
    const { result, res } = response();
    await handler(
      {
        url: `/api/proxy?__tabi_path=${path}&q=S%C3%A3o+Paulo`,
        method: "GET",
        headers: {},
      } as Request,
      res,
    );
    expect(result.statusCode).toBe(200);
    const target = fetcher.mock.calls[0][0] as URL;
    expect(target.pathname).toBe(`/api/${path}`);
    expect(target.searchParams.get("q")).toBe("São Paulo");
    expect(target.searchParams.has("__tabi_path")).toBe(false);
  });
  it("aceita o caminho da reescrita no helper query da Vercel", async () => {
    vi.stubEnv("API_PROXY_TARGET", "https://tabi-api.example");
    const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetcher);
    const { res } = response();
    await handler(
      {
        url: "/api/auth/me?lang=pt",
        query: { __tabi_path: "auth/me", lang: "pt" },
        method: "GET",
        headers: {},
      } as Request,
      res,
    );
    expect(String(fetcher.mock.calls[0][0])).toBe(
      "https://tabi-api.example/api/auth/me?lang=pt",
    );
  });
  it.each([undefined, "../private", "auth/../../private", "auth?bypass=1"])(
    "recusa caminhos internos inválidos (%s)",
    async (path) => {
      vi.stubEnv("API_PROXY_TARGET", "https://tabi-api.example");
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      const { result, res } = response();
      await handler(
        {
          url: "/api/proxy",
          query: path ? { __tabi_path: path } : {},
          method: "GET",
          headers: {},
        } as Request,
        res,
      );
      expect(result.statusCode).toBe(404);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("recusa destino sem HTTPS e payload grande demais", async () => {
    vi.stubEnv("API_PROXY_TARGET", "http://insecure.example");
    const a = response();
    await handler(
      {
        url: "/api/proxy?__tabi_path=trips",
        headers: {},
        method: "GET",
      } as Request,
      a.res,
    );
    expect(a.result.statusCode).toBe(502);
    vi.stubEnv("API_PROXY_TARGET", "https://safe.example");
    const b = response();
    const req = Object.assign(Readable.from([]), {
      url: "/api/proxy?__tabi_path=trips",
      method: "POST",
      headers: {},
      body: { notes: "x".repeat(513 * 1024) },
    }) as unknown as Request;
    await handler(req, b.res);
    expect(b.result.statusCode).toBe(413);
  });
});
