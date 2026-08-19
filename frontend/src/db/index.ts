import { config } from "dotenv";
import { resolve } from "path";

const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
config({ path: resolve(process.cwd(), envFile) });

if (!process.env.DATABASE_URL) {
  config({ path: resolve(process.cwd(), ".env.local") });
}

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL not found");
  console.error("Current directory:", process.cwd());
  console.error("NODE_ENV:", process.env.NODE_ENV);
  console.error("Looking for:", envFile);
  throw new Error("DATABASE_URL is required");
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
