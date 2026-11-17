import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { setupDatabase } from "../server/database.js";
import { makeApp } from "../server/app.js";
const memory = await MongoMemoryServer.create();
const client = new MongoClient(memory.getUri());
await client.connect();
const db = client.db("tabi_browser_test");
await setupDatabase(db);
const server = makeApp(db, {
  production: false,
  origins: ["http://127.0.0.1:5181"],
  disableRateLimit: true,
}).listen(4001, "127.0.0.1", () =>
  console.log("Tabi QA API ready on 4001 (isolated database)."),
);
const close = () => {
  server.close(
    () =>
      void client
        .close()
        .then(() => memory.stop())
        .then(() => process.exit(0)),
  );
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
