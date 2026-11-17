import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { MongoServerError, ObjectId } from "mongodb";
import type { Db } from "mongodb";
import { ZodError } from "zod";
import {
  createTripSchema,
  loginSchema,
  registerSchema,
  updateTripSchema,
} from "../shared/schema.js";
import { seedTrip } from "../shared/planner.js";
import { collections } from "./database.js";
import type { UserDocument, TripDocument } from "./database.js";
import {
  hashPassword,
  sessionToken,
  tokenHash,
  verifyPassword,
} from "./security.js";
import {
  countries,
  countryMap,
  destinationFor,
  recommendations,
} from "./countries.js";

export interface AppConfig {
  production: boolean;
  origins: string[];
  disableRateLimit?: boolean;
}
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const publicUser = (u: UserDocument) => ({
  id: u._id.toHexString(),
  name: u.name,
  email: u.email,
});
const publicTrip = (t: TripDocument) => {
  const { _id, ownerId: _, createdAt, updatedAt, ...data } = t;
  return {
    ...data,
    id: _id.toHexString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
};
export function makeApp(db: Db, config: AppConfig) {
  const app = express();
  const c = collections(db);
  const cookieName = config.production ? "__Host-tabi" : "tabi_session";
  const cookieOptions = {
    httpOnly: true,
    secure: config.production,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 14 * 24 * 60 * 60 * 1000,
  };
  const actors = new WeakMap<Request, UserDocument>();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) =>
        callback(null, !origin || config.origins.includes(origin)),
      credentials: true,
      allowedHeaders: ["Content-Type", "X-Tabi-Request"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );
  app.use(express.json({ limit: "512kb" }));
  app.use(cookieParser());
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use("/api", (req, _res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const origin = req.get("origin");
    if (
      req.get("X-Tabi-Request") !== "1" ||
      (origin && !config.origins.includes(origin))
    )
      return next(
        new HttpError(
          403,
          "Esta solicitação não foi autorizada. Reabra o Tabi e tente novamente.",
        ),
      );
    next();
  });
  if (!config.disableRateLimit) {
    app.use(
      "/api",
      rateLimit({
        windowMs: 60000,
        limit: 200,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: {
          message: "Muitas solicitações. Aguarde um minuto e tente novamente.",
        },
      }),
    );
    app.use(
      "/api/auth",
      rateLimit({
        windowMs: 15 * 60000,
        limit: 40,
        skip: (req) => req.method === "GET",
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message: {
          message:
            "Muitas tentativas de acesso. Aguarde 15 minutos e tente novamente.",
        },
      }),
    );
  }
  const auth = async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = req.cookies[cookieName];
      if (typeof token !== "string" || token.length > 128)
        throw new HttpError(401, "Entre na sua conta para continuar.");
      const session = await c.sessions.findOne({
        tokenHash: tokenHash(token),
        expiresAt: { $gt: new Date() },
      });
      const user = session
        ? await c.users.findOne({ _id: session.userId })
        : null;
      if (!user)
        throw new HttpError(401, "Sua sessão expirou. Entre novamente.");
      actors.set(req, user);
      next();
    } catch (e) {
      next(e);
    }
  };
  const startSession = async (
    req: Request,
    res: Response,
    user: UserDocument,
  ) => {
    const previous = req.cookies[cookieName];
    if (typeof previous === "string")
      await c.sessions.deleteOne({ tokenHash: tokenHash(previous) });
    const token = sessionToken();
    await c.sessions.insertOne({
      tokenHash: tokenHash(token),
      userId: user._id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + cookieOptions.maxAge),
    });
    res.cookie(cookieName, token, cookieOptions);
  };
  const tripQuery = (req: Request) => {
    const id = String(req.params.id);
    if (!/^[a-f\d]{24}$/i.test(id))
      throw new HttpError(404, "Viagem não encontrada.");
    return { _id: new ObjectId(id), ownerId: actors.get(req)!._id };
  };
  app.get("/api/health", async (_req, res) => {
    try {
      await db.command({ ping: 1 });
      res.json({ status: "ok" });
    } catch {
      res
        .status(503)
        .json({
          status: "unavailable",
          message: "O banco de dados está indisponível.",
        });
    }
  });
  app.get("/api/destinations/countries", (_req, res) =>
    res.json({ countries }),
  );
  app.get("/api/destinations/search", async (req, res) => {
    const query = String(req.query.q || "").trim();
    const code = String(req.query.country || "");
    if (query.length < 2 || query.length > 100 || !countryMap.has(code))
      return res.json({ results: [] });
    try {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.search = new URLSearchParams({
        name: query,
        count: "8",
        language: "pt",
        format: "json",
        countryCode: code,
      }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(4500) });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as {
        results?: {
          id: number;
          name: string;
          country_code: string;
          admin1?: string;
          latitude: number;
          longitude: number;
        }[];
      };
      res.json({
        results: (data.results || [])
          .filter((x) => x.country_code === code)
          .map((x) => ({
            id: x.id,
            name: x.name,
            region: x.admin1 || "",
            countryCode: x.country_code,
            latitude: x.latitude,
            longitude: x.longitude,
          })),
      });
    } catch {
      res.json({ results: [], unavailable: true });
    }
  });
  app.post("/api/auth/register", async (req, res) => {
    const input = registerSchema.parse(req.body);
    if (await c.users.findOne({ email: input.email }))
      throw new HttpError(
        409,
        "Não foi possível criar a conta com esse e-mail. Tente entrar ou use outro endereço.",
      );
    const user: UserDocument = {
      _id: new ObjectId(),
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      createdAt: new Date(),
    };
    try {
      await c.users.insertOne(user);
    } catch (e) {
      if (e instanceof MongoServerError && e.code === 11000)
        throw new HttpError(
          409,
          "Não foi possível criar a conta com esse e-mail.",
        );
      throw e;
    }
    await startSession(req, res, user);
    res.status(201).json({ user: publicUser(user) });
  });
  app.post("/api/auth/login", async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await c.users.findOne({ email: input.email });
    const valid = await verifyPassword(input.password, user?.passwordHash);
    if (!user || !valid)
      throw new HttpError(401, "E-mail ou senha incorretos.");
    await startSession(req, res, user);
    res.json({ user: publicUser(user) });
  });
  app.get("/api/auth/me", auth, (req, res) =>
    res.json({ user: publicUser(actors.get(req)!) }),
  );
  app.post("/api/auth/logout", async (req, res) => {
    const token = req.cookies[cookieName];
    if (typeof token === "string")
      await c.sessions.deleteOne({ tokenHash: tokenHash(token) });
    res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
    res.status(204).end();
  });
  app.get("/api/trips", auth, async (req, res) => {
    const trips = await c.trips
      .find({ ownerId: actors.get(req)!._id })
      .sort({ updatedAt: -1 })
      .limit(100)
      .toArray();
    res.json({ trips: trips.map(publicTrip) });
  });
  app.post("/api/trips", auth, async (req, res) => {
    const input = createTripSchema.parse(req.body);
    if (!countryMap.has(input.countryCode))
      throw new HttpError(400, "Escolha um país válido.");
    if (
      (await c.trips.countDocuments(
        { ownerId: actors.get(req)!._id },
        { limit: 100 },
      )) >= 100
    )
      throw new HttpError(
        400,
        "Você já tem 100 viagens. Remova uma antes de criar outra.",
      );
    const destination = destinationFor(input.countryCode, input.city);
    const now = new Date();
    const trip: TripDocument = {
      ...seedTrip(input, destination),
      _id: new ObjectId(),
      ownerId: actors.get(req)!._id,
      destination,
      revision: 0,
      createdAt: now,
      updatedAt: now,
    };
    await c.trips.insertOne(trip);
    res.status(201).json({ trip: publicTrip(trip) });
  });
  app.get("/api/trips/:id", auth, async (req, res) => {
    const trip = await c.trips.findOne(tripQuery(req));
    if (!trip) throw new HttpError(404, "Viagem não encontrada.");
    res.json({ trip: publicTrip(trip) });
  });
  app.put("/api/trips/:id", auth, async (req, res) => {
    const query = tripQuery(req);
    const input = updateTripSchema.parse(req.body);
    if (input.data.route.some((s) => !countryMap.has(s.countryCode)))
      throw new HttpError(400, "Há um país inválido no roteiro.");
    const trip = await c.trips.findOneAndUpdate(
      { ...query, revision: input.revision },
      { $set: { ...input.data, updatedAt: new Date() }, $inc: { revision: 1 } },
      { returnDocument: "after" },
    );
    if (!trip) {
      if (!(await c.trips.findOne(query)))
        throw new HttpError(404, "Viagem não encontrada.");
      throw new HttpError(
        409,
        "Essa viagem foi alterada em outra aba. Recarregue antes de continuar para preservar as duas versões.",
      );
    }
    res.json({ trip: publicTrip(trip) });
  });
  app.delete("/api/trips/:id", auth, async (req, res) => {
    const result = await c.trips.deleteOne(tripQuery(req));
    if (!result.deletedCount)
      throw new HttpError(404, "Viagem não encontrada.");
    res.status(204).end();
  });
  app.get("/api/trips/:id/discover", auth, async (req, res) => {
    const trip = await c.trips.findOne(tripQuery(req));
    if (!trip) throw new HttpError(404, "Viagem não encontrada.");
    const stop =
      trip.route.find((s) => s.id === String(req.query.stop || "")) ||
      trip.route[0];
    res.json({
      recommendations: recommendations(stop.countryCode, stop.city),
      city: stop.city,
    });
  });
  app.use("/api", (_req, _res, next) =>
    next(new HttpError(404, "Recurso não encontrado.")),
  );
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof ZodError)
        return res
          .status(400)
          .json({
            message:
              error.issues[0]?.message || "Confira os campos preenchidos.",
            fields: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          });
      if (error instanceof HttpError)
        return res.status(error.status).json({ message: error.message });
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        error.status === 413
      )
        return res
          .status(413)
          .json({
            message: "Esse planejamento ultrapassa o tamanho permitido.",
          });
      if (error instanceof SyntaxError)
        return res
          .status(400)
          .json({ message: "O formato dos dados é inválido." });
      console.error(
        "Falha na API:",
        error instanceof Error ? error.name : "UnknownError",
      );
      return res
        .status(500)
        .json({
          message:
            "Não foi possível concluir agora. Tente novamente em instantes.",
        });
    },
  );
  return app;
}
