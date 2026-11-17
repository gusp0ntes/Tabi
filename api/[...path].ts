import type { IncomingMessage, ServerResponse } from "node:http";
export const config = { maxDuration: 60 };
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  const origin = process.env.API_PROXY_TARGET;
  if (!origin) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message:
          "O serviço ainda está sendo configurado. Defina API_PROXY_TARGET no projeto da Vercel.",
      }),
    );
    return;
  }
  try {
    const base = new URL(origin);
    if (base.protocol !== "https:" || base.username || base.password)
      throw new Error("Invalid backend URL");
    const incoming = new URL(req.url || "/", "https://tabi.local");
    if (!incoming.pathname.startsWith("/api/")) {
      res.statusCode = 404;
      res.end();
      return;
    }
    const target = new URL(incoming.pathname + incoming.search, base.origin);
    const headers = new Headers({ Accept: "application/json" });
    for (const key of ["cookie", "origin", "content-type", "x-tabi-request"]) {
      const value = req.headers[key];
      if (typeof value === "string") headers.set(key, value);
    }
    let body: string | undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body !== undefined)
        body =
          typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      else {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) {
          const data = Buffer.from(chunk);
          size += data.length;
          if (size > 512 * 1024) {
            res.statusCode = 413;
            res.end(
              JSON.stringify({ message: "Esse planejamento é muito grande." }),
            );
            return;
          }
          chunks.push(data);
        }
        body = Buffer.concat(chunks).toString("utf8");
      }
    }
    if (body && Buffer.byteLength(body) > 512 * 1024) {
      res.statusCode = 413;
      res.end(JSON.stringify({ message: "Esse planejamento é muito grande." }));
      return;
    }
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(45000),
    });
    res.statusCode = upstream.status;
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/json",
    );
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader("Set-Cookie", cookies);
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message:
          "O serviço está iniciando ou ficou indisponível. Aguarde alguns instantes e tente novamente.",
      }),
    );
  }
}
