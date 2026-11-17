import "dotenv/config";
import { connectDatabase } from "./database.js";
import { makeApp } from "./app.js";
const uri = process.env.MONGODB_URI;
const origins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const production = process.env.NODE_ENV === "production";
if (!uri) {
  console.error("Configure MONGODB_URI no ambiente do backend.");
  process.exit(1);
}
if (production && origins.length === 0) {
  console.error("Configure CLIENT_ORIGIN com a origem HTTPS do frontend.");
  process.exit(1);
}
try {
  const { client, db } = await connectDatabase(
    uri,
    process.env.MONGODB_DB || "tabi",
  );
  const server = makeApp(db, {
    production,
    origins: origins.length
      ? origins
      : ["http://127.0.0.1:5173", "http://localhost:5173"],
  }).listen(Number(process.env.PORT) || 4000, "0.0.0.0", () =>
    console.log(`Tabi API pronta na porta ${process.env.PORT || 4000}.`),
  );
  const stop = () => {
    server.close(() => void client.close().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
} catch (error) {
  console.error(
    "Não foi possível conectar ao MongoDB. Confira a credencial e o acesso de rede no Atlas.",
    error instanceof Error ? error.name : "ConnectionError",
  );
  process.exit(1);
}
