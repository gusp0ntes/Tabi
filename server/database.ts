import { MongoClient, ObjectId } from "mongodb";
import type { Db } from "mongodb";
import type { Destination, TripData } from "../shared/schema.js";
export interface UserDocument {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}
export interface SessionDocument {
  _id?: ObjectId;
  tokenHash: string;
  userId: ObjectId;
  expiresAt: Date;
  createdAt: Date;
}
export interface TripDocument extends TripData {
  _id: ObjectId;
  ownerId: ObjectId;
  destination: Destination;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}
export const collections = (db: Db) => ({
  users: db.collection<UserDocument>("users"),
  sessions: db.collection<SessionDocument>("sessions"),
  trips: db.collection<TripDocument>("trips"),
});
export async function setupDatabase(db: Db) {
  const c = collections(db);
  await Promise.all([
    c.users.createIndex({ email: 1 }, { unique: true }),
    c.sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    c.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.trips.createIndex({ ownerId: 1, updatedAt: -1 }),
  ]);
}
export async function connectDatabase(uri: string, name: string) {
  const client = new MongoClient(uri, {
    maxPoolSize: 15,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 12000,
    connectTimeoutMS: 12000,
  });
  await client.connect();
  const db = client.db(name);
  await setupDatabase(db);
  return { client, db };
}
