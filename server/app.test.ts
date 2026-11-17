import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import request from "supertest";
import { makeApp } from "./app.js";
import { setupDatabase, collections } from "./database.js";
import { tripData } from "../shared/planner.js";
import type { Trip } from "../shared/schema.js";
let memory: MongoMemoryServer,
  client: MongoClient,
  app: ReturnType<typeof makeApp>;
let alice: ReturnType<typeof request.agent>,
  bob: ReturnType<typeof request.agent>;
const send = (r: request.Test) =>
  r.set("X-Tabi-Request", "1").set("Origin", "http://localhost:5173");
const tripInput = {
  countryCode: "JP",
  city: "",
  travelers: 2,
  days: 15,
  startDate: "2028-10-08",
  style: "balanced",
};
beforeAll(async () => {
  memory = await MongoMemoryServer.create();
  client = new MongoClient(memory.getUri());
  await client.connect();
  const db = client.db("tabi_test");
  await setupDatabase(db);
  app = makeApp(db, {
    production: false,
    origins: ["http://localhost:5173"],
    disableRateLimit: true,
  });
  alice = request.agent(app);
  bob = request.agent(app);
  await send(alice.post("/api/auth/register"))
    .send({
      name: "Alice",
      email: "alice@example.test",
      password: "uma senha de teste",
    })
    .expect(201);
  await send(bob.post("/api/auth/register"))
    .send({
      name: "Bob",
      email: "bob@example.test",
      password: "outra senha de teste",
    })
    .expect(201);
});
afterAll(async () => {
  await client?.close();
  await memory?.stop();
});
describe("contas e sessões", () => {
  it("protege a senha e não a inclui na sessão retornada", async () => {
    const r = await alice.get("/api/auth/me").expect(200);
    expect(r.body.user).toMatchObject({
      name: "Alice",
      email: "alice@example.test",
    });
    expect(r.body.user.passwordHash).toBeUndefined();
    const u = await collections(client.db("tabi_test")).users.findOne({
      email: "alice@example.test",
    });
    expect(u!.passwordHash).toMatch(/^scrypt\$/);
    expect(u!.passwordHash).not.toContain("uma senha de teste");
  });
  it("rejeita cadastro inválido e e-mail duplicado", async () => {
    await send(request(app).post("/api/auth/register"))
      .send({ name: "A", email: "invalid", password: "123" })
      .expect(400);
    await send(request(app).post("/api/auth/register"))
      .send({
        name: "Outro",
        email: "ALICE@example.test",
        password: "uma senha valida",
      })
      .expect(409);
  });
  it("não autentica senha errada nem acesso anônimo", async () => {
    await send(request(app).post("/api/auth/login"))
      .send({ email: "alice@example.test", password: "senha incorreta" })
      .expect(401);
    await request(app).get("/api/trips").expect(401);
  });
  it("usa cookie HttpOnly e invalida a sessão no logout", async () => {
    const agent = request.agent(app);
    const r = await send(agent.post("/api/auth/login"))
      .send({ email: "ALICE@example.test", password: "uma senha de teste" })
      .expect(200);
    expect(r.headers["set-cookie"][0]).toMatch(/HttpOnly/);
    expect(r.headers["set-cookie"][0]).toMatch(/SameSite=Lax/);
    await send(agent.post("/api/auth/logout")).expect(204);
    await agent.get("/api/auth/me").expect(401);
  });
  it("bloqueia mutações de uma origem não permitida", async () => {
    await alice
      .post("/api/trips")
      .set("Origin", "https://outro.exemplo")
      .set("X-Tabi-Request", "1")
      .send(tripInput)
      .expect(403);
    await alice.post("/api/trips").send(tripInput).expect(403);
  });
});
describe("viagens privadas e persistência", () => {
  it("cria e carrega uma viagem completa", async () => {
    const r = await send(alice.post("/api/trips")).send(tripInput).expect(201);
    const trip = r.body.trip as Trip;
    expect(trip.route.map((s) => s.city)).toEqual(["Tóquio", "Kyoto", "Osaka"]);
    expect(trip.ownerId).toBeUndefined();
    const loaded = await alice.get("/api/trips/" + trip.id).expect(200);
    expect(loaded.body.trip).toEqual(trip);
  });
  it("separa dados e impede leitura, edição, exclusão e guias de outra conta", async () => {
    const r = await send(alice.post("/api/trips")).send(tripInput).expect(201);
    const trip = r.body.trip as Trip;
    await bob.get("/api/trips/" + trip.id).expect(404);
    await send(bob.put("/api/trips/" + trip.id))
      .send({ revision: 0, data: tripData(trip) })
      .expect(404);
    await send(bob.delete("/api/trips/" + trip.id)).expect(404);
    await bob.get("/api/trips/" + trip.id + "/discover").expect(404);
    const list = await bob.get("/api/trips").expect(200);
    expect(list.body.trips.some((t: Trip) => t.id === trip.id)).toBe(false);
  });
  it("salva os dados e evita sobrescrever mudanças de outra aba", async () => {
    const r = await send(alice.post("/api/trips")).send(tripInput).expect(201);
    const trip = r.body.trip as Trip;
    const data = { ...tripData(trip), cash: 6000 };
    const changed = await send(alice.put("/api/trips/" + trip.id))
      .send({ revision: 0, data })
      .expect(200);
    expect(changed.body.trip.revision).toBe(1);
    await send(alice.put("/api/trips/" + trip.id))
      .send({ revision: 0, data: { ...data, cash: 1 } })
      .expect(409);
    const loaded = await alice.get("/api/trips/" + trip.id);
    expect(loaded.body.trip.cash).toBe(6000);
  });
  it("rejeita alterações de proprietário e roteiros inválidos", async () => {
    const r = await send(alice.post("/api/trips")).send(tripInput);
    const trip = r.body.trip as Trip;
    await send(alice.put("/api/trips/" + trip.id))
      .send({ revision: 0, data: { ...tripData(trip), ownerId: "fake" } })
      .expect(400);
    await send(alice.put("/api/trips/" + trip.id))
      .send({ revision: 0, data: { ...tripData(trip), days: 3 } })
      .expect(400);
  });
  it("aceita qualquer país válido e dias sem data definida", async () => {
    const r = await send(bob.post("/api/trips"))
      .send({
        ...tripInput,
        countryCode: "NZ",
        city: "Queenstown",
        days: 7,
        startDate: null,
      })
      .expect(201);
    expect(r.body.trip.destination.region).toBe("oceania");
    expect(r.body.trip.startDate).toBeNull();
    await send(bob.delete("/api/trips/" + r.body.trip.id)).expect(204);
    await bob.get("/api/trips/" + r.body.trip.id).expect(404);
  });
});
