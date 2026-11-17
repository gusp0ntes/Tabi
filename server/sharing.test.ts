import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";
import request from "supertest";
import { makeApp } from "./app.js";
import { setupDatabase, collections } from "./database.js";
import { tripData } from "../shared/planner.js";
import type { Trip } from "../shared/schema.js";

let memory: MongoMemoryServer,
  client: MongoClient,
  app: ReturnType<typeof makeApp>;
let owner: ReturnType<typeof request.agent>,
  guest: ReturnType<typeof request.agent>,
  other: ReturnType<typeof request.agent>;
const mutate = (r: request.Test) =>
  r.set("X-Tabi-Request", "1").set("Origin", "http://localhost:5173");
const input = {
  countryCode: "JP",
  city: "",
  travelers: 2,
  days: 15,
  startDate: "2028-10-08",
  style: "balanced",
};
const privateDetails = {
  cash: 98765,
  notes: { "2028-10-08": "ANOTACAO_PRIVADA" },
  bookings: [
    {
      id: "private-hotel",
      name: "RESERVA_PRIVADA",
      category: "hotel",
      amount: 12345,
      paid: true,
      date: null,
      url: "https://example.test/private-booking",
      notes: "CODIGO_PRIVADO",
    },
  ],
  activities: [
    {
      id: "walk",
      name: "Caminhada em Kyoto",
      day: 5,
      city: "Kyoto",
      done: false,
      notes: "NOTA_PASSEIO_PRIVADA",
    },
  ],
};
beforeAll(async () => {
  memory = await MongoMemoryServer.create();
  client = new MongoClient(memory.getUri());
  await client.connect();
  await setupDatabase(client.db("sharing_test"));
  app = makeApp(client.db("sharing_test"), {
    production: false,
    origins: ["http://localhost:5173"],
    disableRateLimit: true,
  });
  [owner, guest, other] = [
    request.agent(app),
    request.agent(app),
    request.agent(app),
  ];
  for (const [agent, name] of [
    [owner, "Organizador"],
    [guest, "Participante"],
    [other, "Outra pessoa"],
  ] as const)
    await mutate(agent.post("/api/auth/register"))
      .send({
        name,
        email: `${name.replaceAll(" ", "")}@example.test`,
        password: "uma senha de testes",
      })
      .expect(201);
});
afterAll(async () => {
  await client?.close();
  await memory?.stop();
});
async function createTrip(): Promise<Trip> {
  const { body } = await mutate(owner.post("/api/trips"))
    .send(input)
    .expect(201);
  const updated = await mutate(owner.put(`/api/trips/${body.trip.id}`))
    .send({ revision: 0, data: { ...tripData(body.trip), ...privateDetails } })
    .expect(200);
  return updated.body.trip;
}
const tokenOf = (path: string) => path.split("/").at(-1)!;

describe("link público de visualização", () => {
  it("mantém viagens privadas por padrão e só expõe a visão geral após autorização", async () => {
    const trip = await createTrip();
    const state = await owner.get(`/api/trips/${trip.id}/sharing`).expect(200);
    expect(state.body.sharing.publicPath).toBeNull();
    await request(app).get(`/api/public/trips/${trip.id}`).expect(404);
    const link = await mutate(
      owner.post(`/api/trips/${trip.id}/sharing`),
    ).expect(201);
    const token = tokenOf(link.body.sharing.publicPath);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const response = await request(app)
      .get(`/api/public/trips/${token}`)
      .expect(200);
    expect(response.body.trip.title).toBe(trip.title);
    expect(response.body.trip.activities).toEqual([
      { id: "walk", name: "Caminhada em Kyoto", day: 5, city: "Kyoto" },
    ]);
    expect(Object.keys(response.body.trip).sort()).toEqual(
      [
        "title",
        "destination",
        "travelers",
        "days",
        "startDate",
        "outboundDate",
        "homeArrivalDate",
        "route",
        "activities",
        "updatedAt",
      ].sort(),
    );
    for (const secret of [
      "ANOTACAO_PRIVADA",
      "RESERVA_PRIVADA",
      "CODIGO_PRIVADO",
      "NOTA_PASSEIO_PRIVADA",
      "ownerId",
      "memberIds",
      "publicShare",
      "invite",
      "98765",
      "password",
    ])
      expect(JSON.stringify(response.body)).not.toContain(secret);
    expect(response.headers["cache-control"]).toBe("no-store");
    await request(app).get(`/api/trips/${trip.id}`).expect(401);
    await mutate(request(app).put(`/api/public/trips/${token}`))
      .send({ title: "Alterado" })
      .expect(404);
    await mutate(request(app).put(`/api/trips/${trip.id}`))
      .send({ revision: trip.revision, data: tripData(trip) })
      .expect(401);
    await guest.get(`/api/trips/${trip.id}`).expect(404);
    const privateTrip = await owner.get(`/api/trips/${trip.id}`).expect(200);
    expect(privateTrip.body.trip.publicShare).toBeUndefined();
    expect(privateTrip.body.trip.invite).toBeUndefined();
  });
  it("permite revogar e renovar links sem reativar o endereço anterior", async () => {
    const trip = await createTrip();
    const a = await mutate(owner.post(`/api/trips/${trip.id}/sharing`)).expect(
      201,
    );
    const b = await mutate(owner.post(`/api/trips/${trip.id}/sharing`)).expect(
      201,
    );
    const oldToken = tokenOf(a.body.sharing.publicPath),
      newToken = tokenOf(b.body.sharing.publicPath);
    expect(newToken).not.toBe(oldToken);
    await request(app).get(`/api/public/trips/${oldToken}`).expect(404);
    await request(app).get(`/api/public/trips/${newToken}`).expect(200);
    await mutate(guest.delete(`/api/trips/${trip.id}/sharing`)).expect(404);
    await mutate(owner.delete(`/api/trips/${trip.id}/sharing`)).expect(200);
    await request(app).get(`/api/public/trips/${newToken}`).expect(404);
    const c = await mutate(owner.post(`/api/trips/${trip.id}/sharing`)).expect(
      201,
    );
    await mutate(owner.delete(`/api/trips/${trip.id}`)).expect(204);
    await request(app)
      .get(`/api/public/trips/${tokenOf(c.body.sharing.publicPath)}`)
      .expect(404);
  });
});

describe("convites e colaboração", () => {
  it("exige conta, permite apenas um aceite e controla as permissões do participante", async () => {
    const trip = await createTrip();
    await guest.get(`/api/trips/${trip.id}`).expect(404);
    const created = await mutate(
      owner.post(`/api/trips/${trip.id}/invite`),
    ).expect(201);
    const token = tokenOf(created.body.sharing.invite.path);
    const preview = await request(app)
      .get(`/api/public/invites/${token}`)
      .expect(200);
    expect(preview.body.trip.title).toBe(trip.title);
    expect(preview.body.trip.cash).toBeUndefined();
    await mutate(request(app).post(`/api/invites/${token}/accept`)).expect(401);
    const accepted = await Promise.all([
      mutate(guest.post(`/api/invites/${token}/accept`)),
      mutate(other.post(`/api/invites/${token}/accept`)),
    ]);
    expect(accepted.map((r) => r.status).sort()).toEqual([200, 410]);
    const member = accepted[0].status === 200 ? guest : other;
    const stranger = member === guest ? other : guest;
    expect(accepted.find((r) => r.status === 200)!.body.tripId).toBe(trip.id);
    await mutate(member.post(`/api/invites/${token}/accept`)).expect(200);
    await request(app).get(`/api/public/invites/${token}`).expect(404);
    await stranger.get(`/api/trips/${trip.id}`).expect(404);
    const loaded = await member.get(`/api/trips/${trip.id}`).expect(200);
    expect(loaded.body.trip.role).toBe("editor");
    expect(loaded.body.trip.cash).toBe(privateDetails.cash);
    expect(loaded.body.trip.invite).toBeUndefined();
    const list = await member.get("/api/trips").expect(200);
    expect(list.body.trips.some((t: Trip) => t.id === trip.id)).toBe(true);
    const changed = await mutate(member.put(`/api/trips/${trip.id}`))
      .send({
        revision: trip.revision,
        data: { ...tripData(trip), title: "Japão em companhia" },
      })
      .expect(200);
    expect(changed.body.trip.revision).toBe(trip.revision + 1);
    await member.get(`/api/trips/${trip.id}/discover`).expect(200);
    await mutate(owner.put(`/api/trips/${trip.id}`))
      .send({ revision: trip.revision, data: tripData(trip) })
      .expect(409);
    expect((await owner.get(`/api/trips/${trip.id}`)).body.trip.title).toBe(
      "Japão em companhia",
    );
    await mutate(member.delete(`/api/trips/${trip.id}`)).expect(404);
    await member.get(`/api/trips/${trip.id}/sharing`).expect(404);
    await mutate(member.post(`/api/trips/${trip.id}/sharing`)).expect(404);
    await mutate(member.post(`/api/trips/${trip.id}/invite`)).expect(404);
    await mutate(member.put(`/api/trips/${trip.id}`))
      .send({
        revision: changed.body.trip.revision,
        data: { ...tripData(changed.body.trip), memberIds: [] },
      })
      .expect(400);
    const sharing = await owner
      .get(`/api/trips/${trip.id}/sharing`)
      .expect(200);
    const memberInfo = sharing.body.sharing.members.find(
      (m: { role: string }) => m.role === "editor",
    );
    await mutate(
      member.delete(`/api/trips/${trip.id}/members/${memberInfo.id}`),
    ).expect(404);
    await mutate(
      owner.delete(`/api/trips/${trip.id}/members/${memberInfo.id}`),
    ).expect(200);
    await member.get(`/api/trips/${trip.id}`).expect(404);
    await mutate(member.put(`/api/trips/${trip.id}`))
      .send({
        revision: changed.body.trip.revision,
        data: tripData(changed.body.trip),
      })
      .expect(404);
    await member.get(`/api/trips/${trip.id}/discover`).expect(404);
    await mutate(member.post(`/api/invites/${token}/accept`)).expect(410);
    expect(
      (await member.get("/api/trips")).body.trips.some(
        (t: Trip) => t.id === trip.id,
      ),
    ).toBe(false);
  });
  it("recusa convites cancelados, substituídos e expirados", async () => {
    const trip = await createTrip();
    const invite = async () =>
      tokenOf(
        (await mutate(owner.post(`/api/trips/${trip.id}/invite`)).expect(201))
          .body.sharing.invite.path,
      );
    const first = await invite(),
      second = await invite();
    await mutate(guest.post(`/api/invites/${first}/accept`)).expect(410);
    await mutate(owner.delete(`/api/trips/${trip.id}/invite`)).expect(200);
    await mutate(guest.post(`/api/invites/${second}/accept`)).expect(410);
    await request(app).get(`/api/public/invites/${second}`).expect(404);
    const expired = await invite();
    await collections(client.db("sharing_test")).trips.updateOne(
      { _id: new ObjectId(trip.id) },
      { $set: { "invite.expiresAt": new Date(Date.now() - 1000) } },
    );
    await request(app).get(`/api/public/invites/${expired}`).expect(404);
    await mutate(guest.post(`/api/invites/${expired}/accept`)).expect(410);
    await request(app).get("/api/public/invites/not-a-token").expect(404);
  });
  it("preserva o organizador e impede ultrapassar 20 participantes", async () => {
    const trip = await createTrip();
    const state = await owner.get(`/api/trips/${trip.id}/sharing`).expect(200);
    const ownerId = state.body.sharing.members[0].id;
    await mutate(
      owner.delete(`/api/trips/${trip.id}/members/${ownerId.toUpperCase()}`),
    ).expect(400);
    const invitation = await mutate(
      owner.post(`/api/trips/${trip.id}/invite`),
    ).expect(201);
    await collections(client.db("sharing_test")).trips.updateOne(
      { _id: new ObjectId(trip.id) },
      { $set: { memberIds: Array.from({ length: 19 }, () => new ObjectId()) } },
    );
    await mutate(owner.post(`/api/trips/${trip.id}/invite`)).expect(400);
    await mutate(
      guest.post(
        `/api/invites/${tokenOf(invitation.body.sharing.invite.path)}/accept`,
      ),
    ).expect(410);
  });
});
